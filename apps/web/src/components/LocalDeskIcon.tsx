// Stable project icon independent of the build channel.
import appIconUrl from "../../../../assets/prod/desk-web-apple-touch-180.png";

export function LocalDeskIcon(props: { readonly className?: string }) {
  return <img src={appIconUrl} alt="" className={props.className} />;
}
