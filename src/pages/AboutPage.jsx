import { useTranslation } from 'react-i18next'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import markdownListComponents from '../components/MarkdownListCustom'
import { MasterAddress } from '../lib/MessengerConst'

export default function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="flex justify-center items-center card">
      <div className="flex flex-col mx-auto w-full p-4 rounded-lg text-left">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => <h1 className="text-4xl font-bold my-4" {...props} />,
            h2: ({ node, ...props }) => <h2 className="text-3xl font-semibold my-3" {...props} />,
            h3: ({ node, ...props }) => <h3 className="text-xl font-semibold my-3" {...props} />,
            ...markdownListComponents
          }}
        >
          {t('about.content', { address: MasterAddress })}
        </Markdown>
      </div>
    </div>
  )
}
