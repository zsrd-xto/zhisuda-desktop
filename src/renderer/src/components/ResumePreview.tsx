import type { ResumeParsedData } from '@shared/types/resume'

interface ResumePreviewProps {
  parsedData: ResumeParsedData
  fileName?: string
}

export function ResumePreview({ parsedData, fileName }: ResumePreviewProps): React.JSX.Element {
  const { basicInfo, workExperiences, projects, educations, certificates } = parsedData

  return (
    <div className="rounded-2xl border border-slate-800 bg-white p-8 text-slate-900 shadow-xl">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-2xl font-bold">{basicInfo.name || fileName || '简历预览'}</h3>
        <p className="mt-2 text-sm text-slate-600">
          {[basicInfo.phone, basicInfo.email, basicInfo.jobIntention].filter(Boolean).join(' · ')}
        </p>
      </div>

      {basicInfo.summary && (
        <section className="mt-6">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">个人优势</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{basicInfo.summary}</p>
        </section>
      )}

      {basicInfo.skills.length > 0 && (
        <section className="mt-6">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">技能标签</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {basicInfo.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {workExperiences.length > 0 && (
        <section className="mt-6">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">工作经历</h4>
          <div className="mt-3 space-y-4">
            {workExperiences.map((item) => (
              <div key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {item.company}
                    {item.position ? ` · ${item.position}` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
                  </p>
                </div>
                {item.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-6">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">项目经历</h4>
          <div className="mt-3 space-y-4">
            {projects.map((item) => (
              <div key={item.id}>
                <p className="font-medium">
                  {item.name}
                  {item.role ? ` · ${item.role}` : ''}
                </p>
                {item.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {educations.length > 0 && (
        <section className="mt-6">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">教育经历</h4>
          <div className="mt-3 space-y-3">
            {educations.map((item) => (
              <p key={item.id} className="text-sm">
                {[item.school, item.major, item.degree].filter(Boolean).join(' · ')}
              </p>
            ))}
          </div>
        </section>
      )}

      {certificates.length > 0 && (
        <section className="mt-6">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            证书和荣誉
          </h4>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {certificates.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
