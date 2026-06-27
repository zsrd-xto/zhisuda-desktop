import type {
  Education,
  ProjectExperience,
  ResumeParsedData,
  WorkExperience
} from '@shared/types/resume'

interface ResumeEditorProps {
  parsedData: ResumeParsedData
  onChange: (data: ResumeParsedData) => void
}

function createId(): string {
  return crypto.randomUUID()
}

export function ResumeEditor({ parsedData, onChange }: ResumeEditorProps): React.JSX.Element {
  const updateBasicInfo = (field: keyof ResumeParsedData['basicInfo'], value: string): void => {
    onChange({
      ...parsedData,
      basicInfo: {
        ...parsedData.basicInfo,
        [field]: value
      }
    })
  }

  const updateSkills = (value: string): void => {
    onChange({
      ...parsedData,
      basicInfo: {
        ...parsedData.basicInfo,
        skills: value
          .split(/[,，、]/)
          .map((item) => item.trim())
          .filter(Boolean)
      }
    })
  }

  const updateWork = (index: number, patch: Partial<WorkExperience>): void => {
    const workExperiences = parsedData.workExperiences.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )
    onChange({ ...parsedData, workExperiences })
  }

  const addWork = (): void => {
    onChange({
      ...parsedData,
      workExperiences: [
        ...parsedData.workExperiences,
        {
          id: createId(),
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          description: ''
        }
      ]
    })
  }

  const updateProject = (index: number, patch: Partial<ProjectExperience>): void => {
    const projects = parsedData.projects.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )
    onChange({ ...parsedData, projects })
  }

  const addProject = (): void => {
    onChange({
      ...parsedData,
      projects: [
        ...parsedData.projects,
        {
          id: createId(),
          name: '',
          role: '',
          description: ''
        }
      ]
    })
  }

  const updateEducation = (index: number, patch: Partial<Education>): void => {
    const educations = parsedData.educations.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    )
    onChange({ ...parsedData, educations })
  }

  const addEducation = (): void => {
    onChange({
      ...parsedData,
      educations: [
        ...parsedData.educations,
        {
          id: createId(),
          school: '',
          major: '',
          degree: '',
          startDate: '',
          endDate: ''
        }
      ]
    })
  }

  const inputClass =
    'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-emerald-500 focus:ring-2'

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="text-lg font-medium text-white">结构化编辑</h3>

      <section className="space-y-3">
        <h4 className="text-sm font-medium text-emerald-300">基本信息</h4>
        <input
          className={inputClass}
          placeholder="姓名"
          value={parsedData.basicInfo.name}
          onChange={(event) => updateBasicInfo('name', event.target.value)}
        />
        <input
          className={inputClass}
          placeholder="手机号"
          value={parsedData.basicInfo.phone}
          onChange={(event) => updateBasicInfo('phone', event.target.value)}
        />
        <input
          className={inputClass}
          placeholder="邮箱"
          value={parsedData.basicInfo.email}
          onChange={(event) => updateBasicInfo('email', event.target.value)}
        />
        <input
          className={inputClass}
          placeholder="求职意向"
          value={parsedData.basicInfo.jobIntention}
          onChange={(event) => updateBasicInfo('jobIntention', event.target.value)}
        />
        <textarea
          className={`${inputClass} min-h-24`}
          placeholder="个人优势 / 自我评价"
          value={parsedData.basicInfo.summary}
          onChange={(event) => updateBasicInfo('summary', event.target.value)}
        />
        <input
          className={inputClass}
          placeholder="技能标签（逗号分隔）"
          value={parsedData.basicInfo.skills.join('，')}
          onChange={(event) => updateSkills(event.target.value)}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-emerald-300">工作经历</h4>
          <button
            type="button"
            onClick={addWork}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            + 添加
          </button>
        </div>
        {parsedData.workExperiences.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-lg border border-slate-800 p-3">
            <input
              className={inputClass}
              placeholder="公司"
              value={item.company}
              onChange={(event) => updateWork(index, { company: event.target.value })}
            />
            <input
              className={inputClass}
              placeholder="职位"
              value={item.position}
              onChange={(event) => updateWork(index, { position: event.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputClass}
                placeholder="开始时间"
                value={item.startDate}
                onChange={(event) => updateWork(index, { startDate: event.target.value })}
              />
              <input
                className={inputClass}
                placeholder="结束时间"
                value={item.endDate}
                onChange={(event) => updateWork(index, { endDate: event.target.value })}
              />
            </div>
            <textarea
              className={`${inputClass} min-h-20`}
              placeholder="工作描述"
              value={item.description}
              onChange={(event) => updateWork(index, { description: event.target.value })}
            />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-emerald-300">项目经历</h4>
          <button
            type="button"
            onClick={addProject}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            + 添加
          </button>
        </div>
        {parsedData.projects.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-lg border border-slate-800 p-3">
            <input
              className={inputClass}
              placeholder="项目名称"
              value={item.name}
              onChange={(event) => updateProject(index, { name: event.target.value })}
            />
            <input
              className={inputClass}
              placeholder="角色"
              value={item.role}
              onChange={(event) => updateProject(index, { role: event.target.value })}
            />
            <textarea
              className={`${inputClass} min-h-20`}
              placeholder="项目描述"
              value={item.description}
              onChange={(event) => updateProject(index, { description: event.target.value })}
            />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-emerald-300">教育经历</h4>
          <button
            type="button"
            onClick={addEducation}
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            + 添加
          </button>
        </div>
        {parsedData.educations.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-lg border border-slate-800 p-3">
            <input
              className={inputClass}
              placeholder="学校"
              value={item.school}
              onChange={(event) => updateEducation(index, { school: event.target.value })}
            />
            <input
              className={inputClass}
              placeholder="专业"
              value={item.major}
              onChange={(event) => updateEducation(index, { major: event.target.value })}
            />
            <input
              className={inputClass}
              placeholder="学历"
              value={item.degree}
              onChange={(event) => updateEducation(index, { degree: event.target.value })}
            />
          </div>
        ))}
      </section>
    </div>
  )
}
