export function Switch({ on, large }: { on: boolean; large?: boolean }) {
  return <span aria-hidden="true" className={'switch' + (on ? ' switch--on' : '') + (large ? ' switch--lg' : '')} />;
}
