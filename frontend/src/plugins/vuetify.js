// You still need to register Vuetify itself
// src/plugins/vuetify.js

import Vue from 'vue'
import Vuetify from 'vuetify/lib'
import PbsLogo from '@/assets/PbsLogo.svg'
import GoogleLogo from '@/assets/GoogleLogo.svg'
import eCampLogo from '@/assets/eCampLogo.svg'

Vue.use(Vuetify)

const opts = {
  icons: {
    values: {
      pbs: { component: PbsLogo },
      google: { component: GoogleLogo },
      ecamp: { component: eCampLogo }
    }
  }
}

export default new Vuetify(opts)