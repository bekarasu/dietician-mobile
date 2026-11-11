import { useCallback, useEffect, useState } from 'react';

import { t } from '../../i18n';
import { recommendationService } from '../../services/recommendationService';
import { showDialog } from '../dialog/dialogStore';

// Lets the user stop the generation a screen is waiting for, while isWaiting.
// Once the server has stopped it, the wait throws an error that
// isGenerationCancelled recognizes, and the screen moves on from there.
export function useCancelGeneration(isWaiting: boolean) {
  const [isCancelling, setIsCancelling] = useState(false);

  // It stays cancelling until the wait ends, so the next one starts afresh.
  useEffect(() => {
    if (!isWaiting) {
      setIsCancelling(false);
    }
  }, [isWaiting]);

  const cancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      if (!(await recommendationService.cancelPlanGeneration())) {
        setIsCancelling(false);
        showDialog({ title: t('dietPlan.generation.tooLateTitle'), message: t('dietPlan.generation.tooLateMessage'), icon: 'checkmark-circle-outline' });
      }
    } catch (e) {
      setIsCancelling(false);
      showDialog({ title: t('common.errors.title'), message: t('dietPlan.generation.stopFailed'), tone: 'danger' });
    }
  }, []);

  const confirmCancel = useCallback(() => {
    showDialog({
      title: t('dietPlan.generation.stopTitle'),
      message: t('dietPlan.generation.stopMessage'),
      buttons: [
        { text: t('dietPlan.generation.stop'), style: 'destructive', onPress: cancel },
        { text: t('common.actions.keepGoing'), style: 'cancel' },
      ],
    });
  }, [cancel]);

  return { confirmCancel, isCancelling };
}
