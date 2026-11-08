import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { AppStackParamList } from '../../navigation/navigationTypes';
import { useSharedPlanOfferStore } from '../../store/useSharedPlanOfferStore';
import { acceptSharedPlanOffer, askToSwitch } from './sharedPlanOffer';

function loadOffer() {
  if (useSharedPlanOfferStore.getState().isAccepting) {
    return;
  }
  // Nothing to ask about if it can't be read. The next open tries again.
  void useSharedPlanOfferStore
    .getState()
    .load()
    .catch(() => undefined);
}

// A shared plan the group's owner started changes nothing until the user
// agrees. This asks them when the app opens, comes back to the foreground, or
// hears of a new one, once per offer per launch. "Not now" leaves it on the
// Shared Meals screen, and the next launch asks again.
export function useSharedPlanOfferPrompt() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const offer = useSharedPlanOfferStore((state) => state.offer);
  const isAccepting = useSharedPlanOfferStore((state) => state.isAccepting);
  const seen = useSharedPlanOfferStore((state) => (offer ? state.seenOfferIds.includes(offer.id) : true));

  useEffect(() => {
    loadOffer();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadOffer();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!offer || seen || isAccepting) {
      return;
    }
    useSharedPlanOfferStore.getState().markSeen(offer.id);
    void askToSwitch(offer, {
      dismissText: 'Not now',
      withKeepOption: true,
      onSwitch: () => {
        // The screen shows the portions being prepared, and lets them stop it.
        navigation.navigate('SharedPlan');
        void acceptSharedPlanOffer();
      },
    });
  }, [offer, seen, isAccepting, navigation]);
}
