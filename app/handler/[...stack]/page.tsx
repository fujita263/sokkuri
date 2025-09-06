import { StackHandler } from '@stackframe/stack'
import { getStackServerApp } from '@/lib/stack'

export default function HandlerPage(props: {
  params: { stack?: string[] }
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const app = getStackServerApp()
  
  return <StackHandler app={app} fullPage routeProps={props} />
}
