import React from 'react'
import ReactDOM from 'react-dom'
import PrintDownload from './PrintDownload.jsx'

let PrintDownloadReactComponent = PrintDownload

/**
 * Taken and adapted from https://github.com/alkin/vue-react/blob/master/src/vue-react.js
 */
export default {
  data () {
    return {
      props: {},
      component: {},
      children: []
    }
  },
  mounted () {
    // Copy all attributes to props
    Object.assign(this.props, this.$attrs)

    // Event handlers and slots aren't mapped here because we don't need them for the print preview

    // Render
    this.refresh()

    // Watch attrs and refresh
    Object.keys(this.$attrs).forEach((prop) => {
      this.$watch(() => this.$attrs[prop], (value) => {
        this.props[prop] = value
        this.refresh()
      })
    })

    if (import.meta.hot) {
      window.addEventListener('hotReloadPrintDownload', (event) => {
        // During a hot reload, replace the whole react component with the new version
        PrintDownloadReactComponent = event.detail
        this.refresh()
      })
    }
  },
  methods: {
    refresh () {
      this.component = ReactDOM.render(React.createElement(PrintDownloadReactComponent, this.props, ...this.children), this.$el)
    }
  },
  render (createElement) {
    return createElement('div')
  }
}
