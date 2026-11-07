import { useCallback, useEffect, useState } from 'react';

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
        showDialog({ title: 'Too late to stop', message: 'Your plan is already being saved.', icon: 'checkmark-circle-outline' });
      }
    } catch (e) {
      setIsCancelling(false);
      showDialog({ title: 'Error', message: 'We couldn\'t stop preparing your plan. Please try again.', tone: 'danger' });
    }
  }, []);

  const confirmCancel = useCallback(() => {
    showDialog({
      title: 'Stop preparing your plan?',
      message: 'Nothing will be saved, and you can start again.',
      buttons: [
        { text: 'Stop', style: 'destructive', onPress: cancel },
        { text: 'Keep going', style: 'cancel' },
      ],
    });
  }, [cancel]);

  return { confirmCancel, isCancelling };
}
