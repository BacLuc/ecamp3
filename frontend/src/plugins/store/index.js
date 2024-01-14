import Vuex from 'vuex'
import lang from './lang'
import auth from './auth'
import preferences from "./preferences";

class StorePlugin {
  install(Vue) {
    // Vue.use(Vuex)
    //
    // store = new Vuex.Store({
    //   modules: {
    //     lang,
    //     auth,
    //     preferences,
    //   },
    //   strict: process.env.NODE_ENV !== 'production',
    // })
  }
}

export let apiStore
export let store

export default new StorePlugin()
