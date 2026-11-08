import { AppProviders } from './src/app/AppProviders';
import { appEnv } from './src/constants/appEnv';
import { installNetworkLogger } from './src/features/networkInspector/installNetworkLogger';

if (appEnv.monitoring) {
  installNetworkLogger();
}

export default function App() {
  return <AppProviders />;
}
