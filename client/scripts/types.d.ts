declare module "raw-loader!*" {
  const value: any;
  export default value;
}

interface JQuery {
  datetimepicker: any;
  iCheck: any;
  Lazy: () => void;
  select2: any;
  tooltip: any;
}
interface JQueryStatic {
  notify: any;
}

interface FlipClock {
  new(el: Element, value: Date | number, options: Record<string, any>);
}

declare const _: any;
declare const CodeMirror: any;
declare const EasyMDE: any;
declare const Tablesort: any;
declare const FlipClock: FlipClock;
