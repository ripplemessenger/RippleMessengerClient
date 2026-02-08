import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import BulletinLink from './BulletinLink'
import BulletinContent from './BulletinContent'
import BulletinFileLink from './BulletinFileLink'
import TextTimestamp from '../../components/TextTimestamp'
import BulletinTools from './BulletinTools'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BsMarkdown, BsFiletypeTxt } from "react-icons/bs"
import AvatarImage from '../AvatarImage'
import TagLink from './TagLink'
import BulletinFileViewer from './BulletinFileViewer'

const BulletinViewer = ({ bulletin }) => {

  const [isMarkdown, setIsMarkdown] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  return (
    <div className={`flex flex-row mx-2 mt-2`}>
      <div className={` flex flex-col items-center pt-3`}>
        <div className='items-center flex flex-row justify-center'>
          <AvatarImage address={bulletin.Address} timestamp={Date.now()} style={'avatar'} />
        </div>
        <BulletinLink address={bulletin.Address} sequence={bulletin.Sequence} hash={bulletin.Hash} />
        <TextTimestamp timestamp={bulletin.SignedAt} textSize={'text-xs'} />

        <BulletinTools address={bulletin.Address} sequence={bulletin.Sequence} hash={bulletin.Hash} json={bulletin.Json} content={bulletin.Content} is_marked={bulletin.is_marked} />
        <div className={`flex flex-row`}>

          <div className='mt-2'>
            {
              isMarkdown ?
                <BsFiletypeTxt className="icon-sm" onClick={() => { setIsMarkdown(false) }} />
                :
                <BsMarkdown className="icon-sm" onClick={() => { setIsMarkdown(true) }} />
            }
          </div>
        </div>
      </div>

      <div className={`min-w-[800px] p-2`}>
        {
          isMarkdown ?
            <div className={`p-2 rounded-lg bg-neutral-200 dark:bg-neutral-700`}>
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-4xl font-bold my-4" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-3xl font-semibold my-3" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xl font-semibold my-3" {...props} />
                  ),
                  ul({ depth, ordered, className, children, ...props }) {
                    return (
                      <ul
                        className={`list-disc pl-6 ${className}`}
                        style={{ paddingLeft: depth * 20 + 'px' }}
                        {...props}
                      >
                        {children}
                      </ul>
                    );
                  },
                  ol({ depth, ordered, className, children, ...props }) {
                    return (
                      <ol
                        className={`list-decimal pl-6 ${className}`}
                        style={{ paddingLeft: depth * 20 + 'px' }}
                        {...props}
                      >
                        {children}
                      </ol>
                    );
                  },
                  li({ className, children, ...props }) {
                    return (
                      <li className={`mb-2 ${className}`} {...props}>
                        {children}
                      </li>
                    );
                  }
                }}
              >
                {bulletin.Content}
              </Markdown>
            </div>
            :
            <BulletinContent content={bulletin.Content} />
        }

        {
          bulletin.Tag !== undefined && bulletin.Tag.length !== 0 &&
          <div className='flex flex-wrap'>
            {bulletin.Tag.map((tag, index) => (
              <div key={tag} className='text-xs text-gray-200 mt-1 px-1'>
                <TagLink tag={tag} />
              </div>
            ))}
          </div>
        }
        {
          bulletin.Quote !== undefined && bulletin.Quote.length !== 0 &&
          <div className='flex flex-wrap'>
            {bulletin.Quote.map((quote, index) => (
              <div key={quote.Hash} className='text-xs text-gray-200 mt-1 px-1'>
                <BulletinLink address={quote.Address} sequence={quote.Sequence} hash={quote.Hash} sour_address={bulletin.Address} />
              </div>
            ))}
          </div>
        }
        {
          bulletin.File !== undefined && bulletin.File.length !== 0 &&
          <div className='flex flex-wrap'>
            {bulletin.File.map((file, index) => (
              <div key={file.Hash} className='text-xs text-gray-200 mt-1 px-1'>
                <BulletinFileViewer name={file.Name} ext={file.Ext} size={file.Size} hash={file.Hash} timestamp={Date.now()} />
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  )
}

export default BulletinViewer