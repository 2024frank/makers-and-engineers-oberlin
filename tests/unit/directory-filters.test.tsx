import { cleanup,render,screen } from '@testing-library/react'
import { afterEach,describe,expect,it } from 'vitest'
import { DirectoryFilters } from '@/components/member/DirectoryFilters'

afterEach(cleanup)
const options={disciplines:['Robotics','Software'],skills:['CAD','Python'],majors:['Physics'],classYears:[2026,2027],interests:['Rover']}

describe('DirectoryFilters',()=>{
  it('shows the filters from the address and leaves the others on All',()=>{
    render(<DirectoryFilters initial={{q:'ada',discipline:'Software',year:'2027',availability:'weekends'}} options={options}/>)
    expect(screen.getByLabelText('Search')).toHaveValue('ada')
    expect(screen.getByLabelText('Discipline')).toHaveValue('Software')
    expect(screen.getByLabelText('Class year')).toHaveValue('2027')
    expect(screen.getByLabelText('Skill')).toHaveValue('')
    expect(screen.getByLabelText('Major')).toHaveValue('')
    expect(screen.getByLabelText('Project interest')).toHaveValue('')
    expect(screen.getByLabelText('Availability')).toHaveValue('weekends')
  })
  it('submits each filter under the name the directory page reads',()=>{
    const{container}=render(<DirectoryFilters initial={{skill:'Python'}} options={options}/>)
    expect(Array.from(new FormData(container.querySelector('form')!).entries())).toEqual([['q',''],['discipline',''],['skill','Python'],['major',''],['year',''],['interest',''],['availability','']])
    expect(Array.from(screen.getByLabelText<HTMLSelectElement>('Class year').options).map(option=>option.value)).toEqual(['','2026','2027'])
  })
})
