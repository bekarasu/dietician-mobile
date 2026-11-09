import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LegalDocumentScreen, legalDocumentScreenOptions } from '../screens/LegalDocumentScreen';
import { LegalUpdateScreen } from '../screens/LegalUpdateScreen';
import { theme } from '../theme/theme';
import type { LegalStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<LegalStackParamList>();

// The documents a signed-in user has yet to accept. RootNavigator shows it
// while there are any.
export function LegalNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen component={LegalUpdateScreen} name="LegalUpdate" />
      <Stack.Screen component={LegalDocumentScreen} name="LegalDocument" options={legalDocumentScreenOptions} />
    </Stack.Navigator>
  );
}
