export {};

declare global {
  interface Window {
    gitChartWindow?: {
      minimize: () => void;
      toggleMaximize: () => void;
      close: () => void;
      onMaximizeState: (listener: (maximized: boolean) => void) => () => void;
    };
  }
}