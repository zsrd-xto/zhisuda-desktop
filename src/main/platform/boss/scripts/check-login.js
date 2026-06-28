(function () {
  const href = window.location.href
  if (href.includes('/web/user') || href.includes('login')) {
    return { loggedIn: false }
  }

  const userNav = document.querySelector('.nav-figure, .geek-nav, .label-text, .user-nav')
  const jobList = document.querySelector('.job-list-box, .job-card-wrapper, .rec-job-list, .job-list')
  const loggedIn = Boolean(userNav || jobList || href.includes('/geek/'))

  return { loggedIn }
})()
