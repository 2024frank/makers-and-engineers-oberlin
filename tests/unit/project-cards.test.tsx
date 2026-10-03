import { render,screen,cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach,describe,it,expect } from 'vitest'
import { ProjectCards } from '@/components/public/ProjectCards'
import { projectCards } from '@/lib/content/projectCards'
import { previewProjects } from '@/lib/content/previewProjects'
afterEach(cleanup)
const projects=[
  {id:'1',slug:'printer',title:'Printer repair',summary:'Install a new controller',status:'open_for_interest',disciplines:['electrical'],image:{url:'/printer.jpg',alt:'Printer'}},
  {id:'2',slug:'recycling',title:'Bottle recycling',summary:'Make filament',status:'proposed',disciplines:['environmental']}
]
describe('Project discovery',()=>{
  it('labels public snapshots without making recruitment or progress claims',()=>{
    render(<ProjectCards projects={projectCards(previewProjects)}/> )
    expect(screen.getAllByText('Project snapshot')).toHaveLength(previewProjects.length)
    expect(screen.queryByText('Not taking members yet')).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+ members?/)).not.toBeInTheDocument()
    expect(screen.queryByRole('img',{name:/milestones done/})).not.toBeInTheDocument()
  })
  it('offers a useful next step when there are no projects instead of an ineffective reset',()=>{
    render(<ProjectCards projects={[]} searchable/> )
    expect(screen.getByRole('heading',{name:'No projects to show yet'})).toBeVisible()
    expect(screen.getByRole('link',{name:'Get involved'})).toHaveAttribute('href','/get-involved')
    expect(screen.queryByRole('button',{name:'Clear search'})).not.toBeInTheDocument()
    expect(screen.queryByText('No matching projects')).not.toBeInTheDocument()
  })
  it('announces complete result counts as a visitor searches and clears surrounding spaces',async()=>{
    const user=userEvent.setup()
    render(<ProjectCards projects={projects} searchable/> )
    expect(screen.getByRole('status')).toHaveAttribute('aria-live','polite')
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic','true')
    expect(screen.getByRole('status')).toHaveTextContent('2 projects')
    await user.type(screen.getByRole('searchbox',{name:'Search projects'}),' controller ')
    expect(screen.getByRole('status')).toHaveTextContent('1 project')
    expect(screen.getByRole('link')).toHaveAttribute('href','/projects/printer')
  })
  it('carries published project difficulty through to its discovery card',()=>{
    render(<ProjectCards projects={projectCards([{...projects[0],difficulty:'Beginner'}])}/> )
    expect(screen.getByRole('link')).toHaveTextContent('Beginner')
  })
  it('combines search and discipline and lets visitors recover from an empty result',async()=>{
    const user=userEvent.setup()
    render(<ProjectCards projects={projects} searchable/>)
    expect(screen.getByRole('img',{name:'Printer'})).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox',{name:'Search projects'}),'controller')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('link')).toHaveAttribute('href','/projects/printer')
    await user.selectOptions(screen.getByRole('combobox'),'environmental')
    expect(screen.getByText('No matching projects')).toBeInTheDocument()
    await user.click(screen.getByRole('button',{name:'Clear search'}))
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
  it('puts the extra filters after the search row and keeps one discipline control',()=>{
    const {container}=render(<ProjectCards projects={projects} searchable filters={{status:'active',discipline:'electrical'}}/>)
    const search=container.querySelector('.project-search')!
    const details=container.querySelector('details.advanced-filters') as HTMLDetailsElement
    expect(search.compareDocumentPosition(details)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(details.open).toBe(true)
    expect(details.querySelector('input[name="discipline"]')).toHaveAttribute('type','hidden')
    expect(details.querySelector('input[name="discipline"]')).toHaveValue('electrical')
  })
  it('leaves the extra filters out when none are passed',()=>{
    const {container}=render(<ProjectCards projects={projects} searchable/>)
    expect(container.querySelector('details.advanced-filters')).toBeNull()
  })
})

it('sizes magazine images for the equal three, two, and one-column public grid', () => {
  render(<ProjectCards projects={projects} layout="magazine"/>)
  expect(screen.getByRole('img', { name: 'Printer' })).toHaveAttribute('sizes', '(max-width:600px) 100vw,(max-width:950px) 50vw,33vw')
})
