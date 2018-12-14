/* eslint-disable no-unused-vars */

function payloadId () {
  var datePart = new Date().getTime() * Math.pow(10, 3)
  var extraPart = Math.floor(Math.random() * Math.pow(10, 3))
  return datePart + extraPart
}

function uuid (a) {
  return a
    ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid)
}

function getIcons () {
  let links = document.getElementsByTagName('link')
  let icons = []

  for (let i = 0; i < links.length; i++) {
    let link = links[i]

    let rel = link.getAttribute('rel')
    if (rel) {
      if (rel.toLowerCase().indexOf('icon') > -1) {
        let href = link.getAttribute('href')

        if (href) {
          if (
            href.toLowerCase().indexOf('https:') === -1 &&
            href.toLowerCase().indexOf('http:') === -1 &&
            href.indexOf('//') !== 0
          ) {
            let absoluteHref =
              window.location.protocol + '//' + window.location.host

            if (href.indexOf('/') === 0) {
              absoluteHref += href
            } else {
              let path = window.location.pathname.split('/')
              path.pop()
              let finalPath = path.join('/')
              absoluteHref += finalPath + '/' + href
            }

            icons.push(absoluteHref)
          } else if (href.indexOf('//') === 0) {
            let absoluteUrl = window.location.protocol + href

            icons.push(absoluteUrl)
          } else {
            icons.push(href)
          }
        }
      }
    }
  }

  return icons
}

function getMetaOfAny (...args) {
  const metaTags = document.getElementsByTagName('meta')

  for (let i = 0; i < metaTags.length; i++) {
    const attributes = ['itemprop', 'property', 'name']
      .map(target => metaTags[i].getAttribute(target))
      .filter(attr => args.includes(attr))

    if (attributes.length && attributes) {
      return metaTags[i].getAttribute('content')
    }
  }

  return ''
}

function getName () {
  const metaTagName = getMetaOfAny(
    'name',
    'og:site_name',
    'og:title',
    'twitter:title'
  )

  if (metaTagName) {
    return metaTagName
  }

  return document.title
}

function getWebsiteData () {
  const name = getName()

  const ssl = window.location.href.startsWith('https')

  const host = window.location.hostname

  const icons = getIcons()

  return {
    name,
    ssl,
    host,
    icons
  }
}
