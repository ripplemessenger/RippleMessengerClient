import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import markdownListComponents from '../components/MarkdownListCustom'
import { MasterAddress } from '../lib/MessengerConst'

export default function AboutPage() {
  const content = `
# Rules  
1. No Human Verification
2. No Content Moderation
3. No Recommendation
4. No Recall
5. Data on My Devices
6. Encrypted Chat
7. Publish(Comment) bulletin freely

## Donate
${MasterAddress}
`
  return (
    <div className="flex justify-center items-center card">
      <div className="flex flex-col mx-auto w-full p-4 rounded-lg text-left">
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
            ...markdownListComponents
          }}
        >
          {content}
        </Markdown>
      </div>
    </div>
  )
}
