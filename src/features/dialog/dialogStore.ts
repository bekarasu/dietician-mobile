import { Ionicons } from '@expo/vector-icons';
import { create } from 'zustand';

export interface DialogButton {
  text: string;
  // Same meaning as in Alert.alert. The cancel button is placed last and also
  // runs when the dialog is dismissed with the back button or a backdrop tap.
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogOptions {
  title: string;
  message?: string;
  // Defaults to 'danger' when a button is destructive, otherwise 'primary'.
  tone?: 'primary' | 'danger';
  // Defaults to an alert icon for 'danger' and an info icon for 'primary'.
  icon?: keyof typeof Ionicons.glyphMap;
  // Defaults to a single OK button.
  buttons?: DialogButton[];
}

export interface QueuedDialog extends DialogOptions {
  id: number;
}

let nextId = 1;

interface DialogState {
  // The first dialog is the one on screen.
  queue: QueuedDialog[];
  show: (options: DialogOptions) => void;
  dismiss: (id: number) => void;
}

// UI state, not user data, so logout does not reset it.
export const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  show: (options) => set((state) => ({ queue: [...state.queue, { ...options, id: nextId++ }] })),
  dismiss: (id) => set((state) => ({ queue: state.queue.filter((dialog) => dialog.id !== id) })),
}));

// Use instead of Alert.alert, whose native dialog can't follow the app's styling.
// A dialog shown while another is open waits for it to close.
export function showDialog(options: DialogOptions) {
  useDialogStore.getState().show(options);
}
