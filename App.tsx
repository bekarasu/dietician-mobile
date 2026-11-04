import { AppProviders } from './src/app/AppProviders';
import { installNetworkLogger } from './src/features/networkInspector/installNetworkLogger';

if (__DEV__) {
  installNetworkLogger();
}

export default function App() {
  return <AppProviders />;
}
