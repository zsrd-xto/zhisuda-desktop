(async function () {
  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  function detectPageIssue() {
    const text = document.body?.innerText || ''
    if (/验证|滑块|安全验证|人机验证|captcha/i.test(text)) {
      return { errorCode: 'CAPTCHA', message: '需要完成验证码' }
    }
    if (/频繁|稍后|操作过快|too frequent|limit/i.test(text)) {
      return { errorCode: 'RATE_LIMIT', message: '操作过于频繁，请稍后在网页中完成验证' }
    }
    return null
  }

  const selectors = [
    '.btn-startchat',
    '.job-detail-operate .btn',
    'a.btn-startchat',
    '[ka*="startchat"]',
    'button[class*="startchat"]',
    '.btn.btn-sure'
  ]

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const selector of selectors) {
      const btn = document.querySelector(selector)
      if (!btn || btn instanceof HTMLButtonElement && btn.disabled) {
        continue
      }
      if (btn instanceof HTMLElement) {
        btn.click()
        await sleep(1800)
        const issue = detectPageIssue()
        if (issue) {
          return { success: false, errorCode: issue.errorCode, message: issue.message }
        }
        return { success: true }
      }
    }
    await sleep(800)
  }

  const issue = detectPageIssue()
  if (issue) {
    return { success: false, errorCode: issue.errorCode, message: issue.message }
  }

  return { success: false, errorCode: 'DOM_CHANGED', message: '未找到「立即沟通」按钮' }
})()
