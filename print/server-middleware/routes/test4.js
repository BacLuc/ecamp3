/**
 * Browserless.io puppeteer endpoint (for more granular control)
 * HTML generated internally and loaded into puppeteer
 *
 * For running locally (puppeteer.launch), the following packages are needed on top of standard WSL2-Ubuntu:
 * sudo apt-get install libnss3-dev libxkbcommon0 libgbm1
 * sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget libgbm-dev
 */

import puppeteer from 'puppeteer'
const { loadNuxt } = require('nuxt')
const { Router } = require('express')

const router = Router()

// Test route
router.use('/test4', async (req, res) => {
  // Launch own puppeteer + Chromium
  const browser = await puppeteer.launch()

  // Connect to browserless.io (puppeteer websocket)
  /* const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://chrome.browserless.io/?token=${process.env.BROWSERLESS_TOKEN}`,
  }) */

  const page = await browser.newPage()

  /**
   * Debugging puppeteer
   */
  page.on('request', (request) =>
    console.log('>>', request.method(), request.url())
  )
  page.on('response', (response) =>
    console.log('<<', response.status(), response.url())
  )
  page.on('error', (err) => {
    console.log('error happen at the page: ', err)
  })
  page.on('pageerror', (pageerr) => {
    console.log('pageerror occurred: ', pageerr)
  })

  try {
    // Get nuxt instance for start (production mode)
    // Make sure to have run `nuxt build` before running this script
    const nuxt = await loadNuxt({ for: 'start' })

    // Capture HTML via internal Nuxt render call
    // TODO: needs some extra work to ensure pagedJs or all other dependencies are already included in generated HTML (not just as links). Browserless.io will not try to fetch additionals links.
    // TODO: check if authentication needs to be provided (or if Nuxt is already aware)
    const { html } = await nuxt.renderRoute('/')

    // set HTML content of current page
    await page.setContent(html)

    /**
     * Following code snippets copied mostly from https://gitlab.pagedmedia.org/tools/pagedjs-cli/-/blob/master/src/printer.js
     */

    // add local pagedjs
    /* const pagedjsLocation = require.resolve('pagedjs/dist/paged.polyfill.js')
    const paths = pagedjsLocation.split('node_modules')
    const scriptPath = paths[0] + 'node_modules' + paths[paths.length - 1] */
    await page.addScriptTag({
      // path: scriptPath,
      url: 'https://unpkg.com/pagedjs/dist/paged.polyfill.js',
    })

    // create Promise to wait for rendered
    let resolver
    const rendered = new Promise(function (resolve, reject) {
      resolver = resolve
    })

    // onRendered function and attach to 'rendered' event from PagedJS
    await page.exposeFunction(
      'onRendered',
      (msg, width, height, orientation) => {
        console.log(msg)
        resolver({ msg, width, height, orientation }) // resolve promise
      }
    )
    await page.evaluate(() => {
      window.PagedPolyfill.on('rendered', (flow) => {
        const msg =
          'Rendering ' +
          flow.total +
          ' pages took ' +
          flow.performance +
          ' milliseconds.'
        window.onRendered(msg, flow.width, flow.height, flow.orientation)
      })
    })

    console.log('awaiting rendered')
    // wait for Promise to fire
    await rendered
    console.log('rendered')

    // print pdf
    const pdf = await page.pdf({
      displayHeaderFooter: false,
      printBackground: true,
      format: 'A4',
      margin: {
        bottom: '0px',
        left: '0px',
        right: '0px',
        top: '0px',
      },
    })
    browser.close()

    res.contentType('application/pdf')
    res.send(pdf)
  } catch (error) {
    console.error({ error }, 'Something happened!')
    browser.close()
    res.send(error)
  }
})

module.exports = router
