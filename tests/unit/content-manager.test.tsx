import { cleanup,render,screen,within } from '@testing-library/react';import userEvent from '@testing-library/user-event';import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';import { ContentManager } from '@/components/admin/content/ContentManager';import { ToastProvider } from '@/components/ui/Toast'
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}})
afterEach(cleanup)
describe('ContentManager',()=>{it('Save draft does not publish',async()=>{const saveDraft=vi.fn().mockResolvedValue(undefined);const publishDraft=vi.fn();const user=userEvent.setup();render(<ToastProvider><ContentManager entityType="projects" title="Projects" rows={[{id:'00000000-0000-4000-8000-000000000001',title:'Robot Arm',status:'scoping',updatedAt:'2026-08-17T00:00:00Z',hasDraft:false,payload:{slug:'robot-arm',title:'Robot Arm',status:'scoping',summary:'',leadName:'',nextStep:''}}]} canPublish={true} onSaveDraft={saveDraft} onPublishDraft={publishDraft}/></ToastProvider>);await user.click(screen.getByRole('button',{name:/edit robot arm/i}));const input=screen.getByLabelText('Title');await user.clear(input);await user.type(input,'New project title');await user.click(screen.getByRole('button',{name:'Save draft'}));expect(saveDraft).toHaveBeenCalled();expect(publishDraft).not.toHaveBeenCalled()})})

describe('Content editor next actions',()=>{
  it('identifies missing event details before attempting publication',async()=>{
    const user=userEvent.setup(), save=vi.fn(), publish=vi.fn()
    render(<ToastProvider><ContentManager entityType="events" title="Events" rows={[]} canPublish initialCreate onSaveDraft={save} onPublishDraft={publish}/></ToastProvider>)
    await user.type(screen.getByLabelText('Title'),'Workshop')
    await user.click(screen.getByRole('button',{name:'Publish'}))
    expect(screen.getByRole('alert')).toHaveTextContent('Start time')
    expect(screen.getByRole('alert')).toHaveTextContent('Organizer name')
    expect(publish).not.toHaveBeenCalled()
  })
  it('opens a new draft directly from a dashboard task',()=>{
    render(<ToastProvider><ContentManager entityType="projects" title="Projects" rows={[]} canPublish initialCreate/></ToastProvider>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })
  it('keeps unsaved changes when the user decides to continue editing',async()=>{
    const user=userEvent.setup()
    render(<ToastProvider><ContentManager entityType="projects" title="Projects" rows={[]} canPublish/></ToastProvider>)
    await user.click(screen.getByRole('button',{name:'New Project'}))
    await user.type(screen.getByLabelText('Title'),'Robot arm')
    await user.click(screen.getByRole('button',{name:'Close dialog'}))
    await user.click(screen.getByRole('button',{name:'Keep editing'}))
    expect(screen.getByLabelText('Title')).toHaveValue('Robot arm')
  })
  it('shows a newly published record in the list immediately',async()=>{
    const user=userEvent.setup()
    render(<ToastProvider><ContentManager entityType="projects" title="Projects" rows={[]} canPublish onSaveDraft={async()=>{}} onPublishDraft={async()=>{}}/></ToastProvider>)
    await user.click(screen.getByRole('button',{name:'New Project'}))
    await user.type(screen.getByLabelText('Title'),'Robot arm')
    await user.click(screen.getByRole('button',{name:'Publish'}))
    await user.click(screen.getByRole('button',{name:'Close dialog'}))
    expect(screen.getByRole('button',{name:'Edit Robot arm'})).toBeInTheDocument()
    expect(within(screen.getByRole('article')).getByText('Published')).toBeInTheDocument()
  })
})

describe('Content row delete shortcut',()=>{
  const row={id:'00000000-0000-4000-8000-000000000002',title:'Launch day',status:'published',updatedAt:'2026-08-17T00:00:00Z',hasDraft:false,payload:{slug:'launch-day',title:'Launch day',excerpt:'',body:'',author:'MEO',featured:false}}
  let scrolled:Element[]
  beforeEach(()=>{
    scrolled=[]
    Element.prototype.scrollIntoView=function(this:Element){scrolled.push(this)}
    vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 0})
  })
  afterEach(()=>vi.unstubAllGlobals())
  it('opens the editor scrolled to the delete step, and only once',async()=>{
    const user=userEvent.setup()
    render(<ToastProvider><ContentManager entityType="news_posts" title="News" rows={[row]} canPublish canDelete/></ToastProvider>)
    await user.click(screen.getByRole('button',{name:'Delete Launch day'}))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(scrolled).toEqual([screen.getByRole('region',{name:'Delete news post'})])
    await user.type(screen.getByLabelText('Excerpt'),'More detail')
    expect(scrolled).toHaveLength(1)
  })
  it('scrolls again each time Delete is used, but not for Edit',async()=>{
    const user=userEvent.setup()
    render(<ToastProvider><ContentManager entityType="news_posts" title="News" rows={[row]} canPublish canDelete/></ToastProvider>)
    await user.click(screen.getByRole('button',{name:'Edit Launch day'}))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(scrolled).toHaveLength(0)
    await user.click(screen.getByRole('button',{name:'Close dialog'}))
    await user.click(screen.getByRole('button',{name:'Delete Launch day'}))
    await user.click(screen.getByRole('button',{name:'Close dialog'}))
    await user.click(screen.getByRole('button',{name:'Delete Launch day'}))
    expect(scrolled).toHaveLength(2)
  })
})
