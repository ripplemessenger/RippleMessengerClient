import { BsFiletypePdf, BsFileEarmark, BsImage, BsFileEarmarkPlay, BsFileEarmarkMusic } from 'react-icons/bs'

const extensionGroups = {
  pdf: ['pdf'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'],
  video: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma'],
}

export default function FileTypeIcon({ extension, className = 'text-lg' }) {
  const ext = (extension || '').toLowerCase().replace('.', '')

  if (extensionGroups.pdf.includes(ext)) {
    return <BsFiletypePdf className={`${className} text-red-500 dark:text-red-400`} />
  }
  if (extensionGroups.image.includes(ext)) {
    return <BsImage className={`${className} text-blue-500 dark:text-blue-400`} />
  }
  if (extensionGroups.video.includes(ext)) {
    return <BsFileEarmarkPlay className={`${className} text-purple-500 dark:text-purple-400`} />
  }
  if (extensionGroups.audio.includes(ext)) {
    return <BsFileEarmarkMusic className={`${className} text-green-500 dark:text-green-400`} />
  }

  return <BsFileEarmark className={`${className} text-text-secondary/60 dark:text-dark-text-secondary/60`} />
}
