import { IoArrowBackSharp, IoArrowForwardSharp, IoReloadSharp } from "react-icons/io5";
import ExternalLink from "./ExternalLink";
import InternalLink from "./InternalLink";

export default function Footer() {
  return (
    <footer className="footer bar">
      <div className="mx-auto max-w-7xl flex justify-between items-center px-8">
        <ExternalLink href={"https://github.com/RippleMessenger/RippleMessengerClient"} title={"RippleMessenger"} text_size={"text-base"} />
        <div className="flex items-center gap-1 bg-surface/20 dark:bg-dark-surface/20 rounded-lg p-1 backdrop-blur-sm">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title="Back"
          >
            <IoArrowBackSharp className="icon" />
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title="Reload"
          >
            <IoReloadSharp className="icon" />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="p-2 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title="Forward"
          >
            <IoArrowForwardSharp className="icon" />
          </button>
        </div>
        <InternalLink path={"/about"} title={"About"} text_size={"text-base"} />
      </div>
    </footer>
  )
}
