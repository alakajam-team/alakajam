export default function evalRawScript(rawModule: { default: unknown }): void {
  // eslint-disable-next-line no-eval
  eval.call(null, rawModule.default);
}
