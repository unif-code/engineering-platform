import '@testing-library/jest-dom';

if (!globalThis.Notification) {
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: class TestNotification {
      static permission = 'default';

      static async requestPermission() {
        return 'default';
      }

      close() {}
    },
  });
}
