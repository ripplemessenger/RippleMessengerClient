import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import BulletinLink from './BulletinLink'
import BulletinContent from './BulletinContent'
import TextTimestamp from '../../components/TextTimestamp'
import BulletinTools from './BulletinTools'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BsMarkdown, BsFiletypeTxt } from "react-icons/bs"
import TagLink from './TagLink'
import BulletinFileViewer from './BulletinFileViewer'
import BulletinAvatarLink from './BulletinAvatarLink'
import markdownListComponents from '../../components/MarkdownListCustom'

const markdownComponents = {
  h1: ({ node, ...props }) => <h1 className="text-4xl font-bold my-4" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-3xl font-semibold my-3" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-xl font-semibold my-3" {...props} />,
  ...markdownListComponents
}

const BulletinViewer = ({ bulletin }) => {

  const [isMarkdown, setIsMarkdown] = useState(false)

  return (
    <div className="flex flex-row mx-2 mt-2 gap-3 w-full max-w-full overflow-hidden min-w-0">
      {/* Left sidebar — avatar only, compact */}
      <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
        <BulletinAvatarLink address={bulletin.address} classNames={'avatar'} />
        <button
          className="p-1 rounded hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
          onClick={() => setIsMarkdown(!isMarkdown)}
          title={isMarkdown ? "Show raw text" : "Show markdown"}
        >
          {isMarkdown ? <BsFiletypeTxt className="icon-sm" /> : <BsMarkdown className="icon-sm" />}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden gap-3">
        {/* Header row: link + timestamp + tools */}
        <div className="flex flex-row items-center gap-2 flex-wrap">
          <BulletinLink address={bulletin.address} sequence={bulletin.sequence} hash={bulletin.hash} />
          <TextTimestamp timestamp={bulletin.signed_at} textSize={'text-xs'} />
          <BulletinTools
            address={bulletin.address}
            sequence={bulletin.sequence}
            hash={bulletin.hash}
            json={bulletin.json}
            content={bulletin.content}
            is_marked={bulletin.is_marked}
          />
        </div>
        {/* Tags — compact, only if any */}
        {bulletin.tag !== undefined && bulletin.tag.length !== 0 && (
          <div className="flex flex-wrap gap-1">
            {bulletin.tag.map((tag) => (
              <TagLink key={tag} tag={tag} />
            ))}
          </div>
        )}

        {/* Content — fills available width */}
        {isMarkdown ? (
          <div className="flex-1 p-3 rounded-lg bg-surface-alt/60 dark:bg-dark-surface-alt/60 text-text-primary dark:text-dark-text-primary overflow-hidden break-words min-w-0">
            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {bulletin.content}
            </Markdown>
          </div>
        ) : (
          <div className="flex-1 min-w-0 overflow-hidden break-words">
            <BulletinContent content={bulletin.content} />
          </div>
        )}

        {/* Quotes — after content */}
        {bulletin.quote !== undefined && bulletin.quote.length !== 0 && (
          <div className="flex flex-wrap gap-1">
            {bulletin.quote.map((quote) => (
              <BulletinLink key={quote.Hash} address={quote.Address} sequence={quote.Sequence} hash={quote.Hash} sour_address={bulletin.address} />
            ))}
          </div>
        )}

        {/* Files — at bottom */}
        {bulletin.file !== undefined && bulletin.file.length !== 0 && (
          <div className="flex flex-wrap gap-1">
            {bulletin.file.map((file) => (
              <BulletinFileViewer key={file.Hash} name={file.Name} ext={file.Ext} size={file.Size} hash={file.Hash} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BulletinViewer
