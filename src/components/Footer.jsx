import { IoArrowBackSharp, IoArrowForwardSharp, IoReloadSharp } from "react-icons/io5";
import ExternalLink from "./ExternalLink";
import InternalLink from "./InternalLink";

export default function Footer() {
  return (
    <footer className="footer bar">
      <div className="mx-auto max-w-7xl flex justify-between items-center px-8">
        <ExternalLink href={"https://github.com/RippleMessenger/RippleMessengerClient"} title={"RippleMessenger"} text_size={"text-base"} />
        <div className="flex justify-center items-center">
          <button
            onClick={() => window.history.back()}
            className="px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
          >
            <IoArrowBackSharp className="icon" />
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
          >
            <IoReloadSharp className="icon" />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
          >
            <IoArrowForwardSharp className="icon" />
          </button>
        </div>
        <div className="flex space-x-4">
          <InternalLink path={"/about"} title={"About"} text_size={"text-base"} />
        </div>
      </div>
    </footer>
  )
}