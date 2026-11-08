const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(relativePath, mocks = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    console: { warn() {} },
    require(name) {
      assert.ok(Object.hasOwn(mocks, name), `Unexpected import: ${name}`);
      return mocks[name];
    },
  }, { filename });
  return exports;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

function fixture(options = {}) {
  const events = [];
  const listeners = {};
  const ready = deferred();
  const tokenRequested = deferred();
  const putStarted = deferred();
  let saved = options.saved ?? null;
  let permission = options.permission ?? 'granted';
  let token = 'fcm-first';
  let registrationFails = false;
  const api = {
    getMessaging: () => ({}),
    setAutoInitEnabled: async (_, value) => { events.push(['autoInit', value]); },
    isDeviceRegisteredForRemoteMessages: () => true,
    registerDeviceForRemoteMessages: async () => undefined,
    getToken: async () => {
      tokenRequested.resolve();
      return options.tokenGate ? options.tokenGate.promise : token;
    },
    deleteToken: async () => { events.push(['deleteToken']); },
    onTokenRefresh: (_, callback) => { listeners.refresh = callback; return () => { delete listeners.refresh; }; },
    onNotificationOpenedApp: (_, callback) => { listeners.open = callback; return () => { delete listeners.open; }; },
    onMessage: (_, callback) => { listeners.message = callback; return () => { delete listeners.message; }; },
    getInitialNotification: async () => { ready.resolve(); return options.initial ?? null; },
  };
  const service = loadSource('src/features/notifications/pushNotifications.ts', {
    'expo-secure-store': {
      getItemAsync: async () => options.preferenceGate ? options.preferenceGate.promise : saved,
      setItemAsync: async (_, value) => { saved = value; },
    },
    'react-native': { AppState: { addEventListener: (_, callback) => {
      listeners.appState = callback;
      return { remove() { delete listeners.appState; } };
    } } },
    zustand: { create: (initialize) => {
      let state = initialize();
      const store = () => state;
      store.getState = () => state;
      store.setState = (change) => { state = { ...state, ...change }; };
      return store;
    } },
    '../../services/deviceService': { deviceService: {
      register: async (value, platform) => {
        events.push(['PUT', value, platform]);
        putStarted.resolve();
        if (registrationFails) throw new Error('offline');
        if (options.putGate) await options.putGate.promise;
      },
      unregister: async (value) => {
        events.push(['DELETE', value]);
        if (options.deleteFails) throw new Error('offline');
      },
    } },
    '../reminders/mealReminders': {
      getReminderPermission: async () => permission,
      requestReminderPermission: async () => { events.push(['prompt']); return permission; },
    },
    './firebaseMessaging': { firebaseMessaging: options.unavailable ? null : api },
  });
  return {
    ...service, events, listeners, ready: ready.promise.then(tick), tokenRequested: tokenRequested.promise, putStarted: putStarted.promise,
    setPermission: (value) => { permission = value; },
    setToken: (value) => { token = value; },
    failRegistration: (value) => { registrationFails = value; },
    state: () => service.usePushNotificationStore.getState(),
  };
}

test('registers an FCM token on launch and its replacement on refresh', async () => {
  const f = fixture();
  f.startPushNotifications(() => {}, () => {});
  await f.ready;
  assert.equal(f.state().registered, true);
  f.setToken('fcm-renewed');
  f.listeners.refresh('fcm-renewed');
  await f.syncPushNotifications();
  assert.ok(f.events.some(([method, token, platform]) => method === 'PUT' && token === 'fcm-renewed' && platform === 'ios'));
});

test('logout while getToken is pending prevents late device registration', async () => {
  const tokenGate = deferred();
  const f = fixture({ tokenGate });
  f.startPushNotifications(() => {}, () => {});
  await f.tokenRequested;
  const stopped = f.stopPushNotifications();
  tokenGate.resolve('late-fcm-token');
  await stopped;
  assert.equal(f.events.filter(([method]) => method === 'PUT').length, 0);
  assert.ok(f.events.some(([method]) => method === 'deleteToken'));
  assert.equal(f.state().registered, false);
  assert.equal(Object.keys(f.listeners).length, 0);
});

test('logout drains an in-flight PUT before removing the device', async () => {
  const putGate = deferred();
  const f = fixture({ putGate });
  f.startPushNotifications(() => {}, () => {});
  await f.putStarted;
  const stopped = f.stopPushNotifications();
  putGate.resolve();
  await stopped;
  assert.deepEqual(f.events.filter(([method]) => ['PUT', 'DELETE', 'deleteToken'].includes(method)), [
    ['PUT', 'fcm-first', 'ios'], ['DELETE', 'fcm-first'], ['deleteToken'],
  ]);
});

test('revoked permission removes the registration on return to the app', async () => {
  const f = fixture();
  f.startPushNotifications(() => {}, () => {});
  await f.ready;
  f.setPermission('blocked');
  f.listeners.appState('active');
  await f.syncPushNotifications();
  assert.ok(f.events.some(([method]) => method === 'DELETE'));
  assert.equal(f.state().permission, 'blocked');
  assert.equal(f.state().token, null);
});

test('saved opt-out prevents permission requests and FCM registration', async () => {
  const f = fixture({ saved: 'false' });
  f.startPushNotifications(() => {}, () => {});
  await f.ready;
  assert.equal(f.state().enabled, false);
  assert.equal(f.state().permission, 'granted');
  assert.equal(f.events.filter(([method]) => ['PUT', 'prompt'].includes(method)).length, 0);
  await f.setPushNotificationsEnabled(true);
  assert.equal(f.state().registered, true);
});

test('opt-out revokes the native token even when backend removal fails', async () => {
  const f = fixture({ deleteFails: true });
  f.startPushNotifications(() => {}, () => {});
  await f.ready;
  await f.setPushNotificationsEnabled(false);
  assert.ok(f.events.some(([method]) => method === 'deleteToken'));
  assert.equal(f.state().registered, false);
  assert.equal(f.state().enabled, false);
});

test('cold-start and subsequent callbacks open a message only once', async () => {
  const message = { messageId: 'one', data: { type: 'sharedplan.invite_received' } };
  const f = fixture({ initial: message });
  const opened = [];
  f.startPushNotifications((value) => opened.push(value), () => {});
  await f.ready;
  await tick();
  f.listeners.open(message);
  assert.equal(opened.length, 1);
});

test('notification taps received while device preferences load are retained', async () => {
  const preferenceGate = deferred();
  const f = fixture({ preferenceGate });
  const opened = [];
  const message = { messageId: 'early', data: { type: 'friendship.request_received' } };
  f.startPushNotifications((value) => opened.push(value), () => {});
  f.listeners.open(message);
  assert.equal(opened.length, 0);
  preferenceGate.resolve(null);
  await f.ready;
  assert.equal(opened[0], message);
});

test('opening a cold-start notification does not wait for device registration', async () => {
  const putGate = deferred();
  const f = fixture({ putGate, initial: { messageId: 'cold', data: { type: 'dietplan.ready' } } });
  const opened = [];
  f.startPushNotifications((value) => opened.push(value), () => {});
  await f.putStarted;
  await f.ready;
  assert.equal(opened.length, 1);
  assert.equal(f.state().registered, false);
  const stopped = f.stopPushNotifications();
  putGate.resolve();
  await stopped;
});

test('failed registration retries successfully on the next sync', async () => {
  const f = fixture();
  f.failRegistration(true);
  f.startPushNotifications(() => {}, () => {});
  await f.ready;
  assert.equal(f.state().registered, false);
  assert.ok(f.state().error);
  f.failRegistration(false);
  await f.syncPushNotifications();
  assert.equal(f.state().registered, true);
  assert.equal(f.state().error, null);
});

test('builds without Firebase native modules remain usable', async () => {
  const f = fixture({ unavailable: true });
  f.startPushNotifications(() => {}, () => {});
  await f.syncPushNotifications();
  await f.stopPushNotifications();
  assert.equal(f.events.length, 0);
  assert.equal(f.state().permission, 'unavailable');
});

test('backend event types route to the expected screens with a safe fallback', () => {
  const { notificationDestination: destination } = loadSource('src/features/notifications/notificationDestination.ts');
  assert.equal(destination({ type: 'friendship.request_received' }), 'Friends');
  assert.equal(destination({ type: 'friendship.request_accepted' }), 'Friends');
  assert.equal(destination({ type: 'sharedplan.invite_received' }), 'SharedPlan');
  assert.equal(destination({ type: 'dietplan.ready', kind: 'shared' }), 'DietPlan');
  assert.equal(destination({ type: 'dietplan.failed' }), 'Home');
  assert.equal(destination({ screen: 'arbitrary-untrusted-screen' }), 'Home');
  assert.equal(destination(), 'Home');
});
