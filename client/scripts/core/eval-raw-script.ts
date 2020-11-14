export default function evalRawScript(rawModule: any) {
  // eslint-disable-next-line no-eval
  eval.call(null, rawModule.default);
}
