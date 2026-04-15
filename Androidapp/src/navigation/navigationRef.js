import { createRef } from 'react';

export const navigationRef = createRef();

export function navigate(name, params) {
  if (navigationRef.current) {
    navigationRef.current.navigate(name, params);
  }
}

export function goBack() {
  if (navigationRef.current?.canGoBack()) {
    navigationRef.current.goBack();
  }
}
