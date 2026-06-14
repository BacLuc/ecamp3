import encoding from 'k6/encoding'
import http from 'k6/http'
import { Trend } from 'k6/metrics'

// noinspection JSUnusedGlobalSymbols
export const options = {
  // A number specifying the number of VUs to run concurrently.
  vus: __ENV.VUS || 10,
  iterations: __ENV.ITERATIONS || 100,
  // A string specifying the total duration of the test run.
  duration: __ENV.DURATION,
}

const host = __ENV.API_ROOT_URL || 'http://localhost:3000'

const basicAuthUser = __ENV.BASIC_AUTH_USER
const basicAuthPassword = __ENV.BASIC_AUTH_PASSWORD

if (!!basicAuthUser !== !!basicAuthPassword) {
  throw new Error('BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must be set together')
}

const basicAuthActive = !!basicAuthUser && !!basicAuthPassword

const specialEndpoints = [
  '/',
  '/api',
  '/api/authentication_token',
  '/api/auth/google',
  '/api/auth/pbsmidata',
  '/api/auth/cevidb',
  '/api/auth/jubladb',
  '/api/auth/reset_password',
  '/api/auth/resend_activation',
  '/api/invitations',
  '/api/personal_invitations'
]

const metricsMap = new Map()

const loginTrend = new Trend('login')

for (const [_, value] of Object.entries(getUrlsToMeasure()._links)) {
  const urlWithoutTemplate = value.href.replace(/{.*$/, '')
  if (!specialEndpoints.includes(urlWithoutTemplate)) {
    metricsMap.set(`${urlWithoutTemplate}`, new Trend(toMetricName(urlWithoutTemplate)))
    metricsMap.set(`${urlWithoutTemplate}/item`, new Trend(toMetricName(`${urlWithoutTemplate}/item`)))
  }
}

for (const url of getCampRelations()) {
  metricsMap.set(url, new Trend(toMetricName(url)));
}


export default function() {
  const payload = JSON.stringify({
    identifier: __ENV.USER || 'test@example.com', password: __ENV.PASSWORD || 'test',
  })
  const loginResponse = http.post(
    `${host}/api/authentication_token`,
    payload,
    { headers: addAuthorizationHeadersIfNecessary({ 'Content-Type': 'application/json' }) })
  loginTrend.add(loginResponse.timings.duration);

  for (const [_, value] of Object.entries(getUrlsToMeasure()._links)) {
    const urlWithoutTemplate = value.href.replace(/{.*$/, '')
    if (!specialEndpoints.includes(urlWithoutTemplate)) {
      const url = `${host}${urlWithoutTemplate}.jsonhal`
      const collection = http.get(url, { headers: addAuthorizationHeadersIfNecessary() })

      metricsMap.get(urlWithoutTemplate)?.add(collection.timings.duration)

      try {
        const itemUrl = JSON.parse(collection.body)._embedded?.items[0]._links.self.href
        const itemResponse = http.get(`${host}${itemUrl}.jsonhal`, { headers: addAuthorizationHeadersIfNecessary() })
        metricsMap.get(`${urlWithoutTemplate}/item`)?.add(itemResponse.timings.duration)
        if (urlWithoutTemplate.includes('/api/camps')) {
          const campItemBody = JSON.parse(itemResponse.body);
          for (const [_, value] of Object.entries(campItemBody._links)) {
            measureCampRelation(value);
          }
          // Also measure period sub-resources (days, schedule_entries)
          const periodsHref = campItemBody._links?.periods?.href;
          if (periodsHref) {
            const periodsResponse = http.get(`${host}${periodsHref}`, { headers: addAuthorizationHeadersIfNecessary({ 'accept': 'application/hal+json' }) });
            const periodItemUrl = JSON.parse(periodsResponse.body)?._embedded?.items[0]?._links?.self?.href;
            if (periodItemUrl) {
              const periodResponse = http.get(`${host}${periodItemUrl}`, { headers: addAuthorizationHeadersIfNecessary({ 'accept': 'application/hal+json' }) });
              for (const [_, value] of Object.entries(JSON.parse(periodResponse.body)._links)) {
                measureCampRelation(value);
              }
            }
          }
        }
      }
      // this also catches the ReferenceError on the long path to find the item url
      catch (e) 
      {
        console.log(`Failed to get item for url ${url}, reason: `, e)
        metricsMap.get(`${urlWithoutTemplate}/item`)?.add(-1E9)
      }
    }
  }
}

function measureCampRelation(value) {
  if (!value?.href) { return; }
  const urlToMeasure = value.href
  const urlWithReplacedId = urlToMeasure.replace(/(\/|%2F)[0-9a-f]{6,}\/?/, "/{id}/");
  const url = `${host}${urlToMeasure}`;
  try {
    const response = http.get(url, { headers: addAuthorizationHeadersIfNecessary({ 'accept': 'application/hal+json' }) });
    const trend = metricsMap.get(urlWithReplacedId);
    if (!trend) {
      console.log(`trend for ${urlWithReplacedId} not found`);
    }
    trend?.add(response.timings.duration);
  } catch (e) {
    console.log(`Failed to fetch url ${url}, reason: `, e);
    metricsMap.get(`${urlWithReplacedId}`)?.add(-1E9);
  }
}


// noinspection JSUnusedGlobalSymbols
export function handleSummary(data) {
  return {
    'stdout': JSON.stringify(data),
  };
}


function getUrlsToMeasure() {
  return {
    '_links': {
      'self': {
        'href': '/api/',
      },
      'invitations': {
        'href': '/api/invitations{/id}{/action}',
        'templated': true,
      },
      'personalInvitations': {
        'href': '/api/personal_invitations{/id}{/action}',
        'templated': true,
      },
      'activities': {
        'href': '/api/activities{/id}{?camp,camp[]}',
        'templated': true,
      },
      'activityProgressLabels': {
        'href': '/api/activity_progress_labels{/id}{?camp,camp[]}',
        'templated': true,
      },
      'activityResponsibles': {
        'href': '/api/activity_responsibles{/id}{?activity,activity[],activity.camp,activity.camp[]}',
        'templated': true,
      },
      'camps': {
        'href': '/api/camps{/id}{?isPrototype,isPrototype[]}',
        'templated': true,
      },
      'campCollaborations': {
        'href': '/api/camp_collaborations{/id}{/action}{?camp,camp[],activityResponsibles.activity,activityResponsibles.activity[]}',
        'templated': true,
      },
      'categories': {
        'href': '/api/categories{/id}{?camp,camp[]}',
        'templated': true,
      },
      'checklists': {
        'href': '/api/checklists{/id}{?camp,camp[],isPrototype,isPrototype[]}',
        'templated': true,
      },
      'checklistItems': {
        'href': '/api/checklist_items{/id}{?checklist,checklist[],checklist.camp,checklist.camp[]}',
        'templated': true,
      },
      'contentNodes': {
        'href': '/api/content_nodes{?contentType,contentType[],root,root[],period}',
        'templated': true,
      },
      'checklistNodes': {
        'href': '/api/content_node/checklist_nodes{/id}{?contentType,contentType[],root,root[],period}',
        'templated': true,
      },
      'columnLayouts': {
        'href': '/api/content_node/column_layouts{/id}{?contentType,contentType[],root,root[],period}',
        'templated': true,
      },
      'materialNodes': {
        'href': '/api/content_node/material_nodes{/id}{?contentType,contentType[],root,root[],period}',
        'templated': true,
      },
      'multiSelects': {
        'href': '/api/content_node/multi_selects{/id}{?contentType,contentType[],root,root[],period}',
        'templated': true,
      },
      'responsiveLayouts': {
        'href': '/api/content_node/responsive_layouts{/id}{?contentType,contentType[],root,root[],period}',
        'templated': true,
      },
      'singleTexts': {
        'href': '/api/content_node/single_texts{/id}{?contentType,contentType[],root,root[],period}',
        'templated': true,
      },
      'storyboards': {
        'href': '/api/content_node/storyboards{/id}{?contentType,contentType[],root,root[],period}',
        'templated': true,
      },
      'contentTypes': {
        'href': '/api/content_types{/id}{?categories,categories[]}',
        'templated': true,
      },
      'days': {
        'href': '/api/days{/id}{?period,period[],period.camp,period.camp[]}',
        'templated': true,
      },
      'dayResponsibles': {
        'href': '/api/day_responsibles{/id}{?day,day[],day.period,day.period[]}',
        'templated': true,
      },
      'materialItems': {
        'href': '/api/material_items{/id}{?materialList,materialList[],materialNode,materialNode[],period}',
        'templated': true,
      },
      'materialLists': {
        'href': '/api/material_lists{/id}{?camp,camp[]}',
        'templated': true,
      },
      'periods': {
        'href': '/api/periods{/id}{?camp,camp[]}',
        'templated': true,
      },
      'profiles': {
        'href': '/api/profiles{/id}{?user.collaborations.camp,user.collaborations.camp[]}',
        'templated': true,
      },
      'scheduleEntries': {
        'href': '/api/schedule_entries{/id}{?period,period[],activity,activity[],start[before],start[strictly_before],start[after],start[strictly_after],end[before],end[strictly_before],end[after],end[strictly_after]}',
        'templated': true,
      },
      'users': {
        'href': '/api/users{/id}{/action}',
        'templated': true,
      },
      'login': {
        'href': '/api/authentication_token',
      },
      'oauthGoogle': {
        'href': '/api/auth/google{?callback}',
        'templated': true,
      },
      'oauthPbsmidata': {
        'href': '/api/auth/pbsmidata{?callback}',
        'templated': true,
      },
      'oauthCevidb': {
        'href': '/api/auth/cevidb{?callback}',
        'templated': true,
      },
      'oauthJubladb': {
        'href': '/api/auth/jubladb{?callback}',
        'templated': true,
      },
      'resetPassword': {
        'href': '/api/auth/reset_password{/id}',
        'templated': true,
      },
      'resendActivation': {
        'href': '/api/auth/resend_activation',
        'templated': false,
      },
    },
  }
}

function getCampRelations() {
  return [
    "/api/camp_collaborations?camp=%2Fapi%2Fcamps/{id}/",
    "/api/periods?camp=%2Fapi%2Fcamps/{id}/",
    "/api/camps/{id}/categories",
    "/api/activity_progress_labels?camp=%2Fapi%2Fcamps/{id}/",
    "/api/activities?camp=%2Fapi%2Fcamps/{id}/",
    "/api/camps/{id}/activities",
    "/api/material_lists?camp=%2Fapi%2Fcamps/{id}/",
    "/api/camps/{id}/checklists",
    "/api/camps/{id}/activity_progress_labels",
    "/api/users/{id}",
    "/api/profiles?user.collaborations.camp=%2Fapi%2Fcamps/{id}/",
    "/api/periods/{id}/schedule_entries",
    "/api/periods/{id}/days",
  ];
}

function toMetricName(name) {
  return name.replaceAll("/", "_")
    .replaceAll("%", "_")
    .replaceAll("{", "_")
    .replaceAll("}", "_")
    .replaceAll("?", "_")
    .replaceAll("=", "_")
    .replaceAll(".", "_");
}

function addAuthorizationHeadersIfNecessary(headers = {}) {
  const authHeaders = {}
  if (basicAuthActive) {
    authHeaders['Authorization'] =  `Basic ${encoding.b64encode(`${basicAuthUser}:${basicAuthPassword}`)}`
  }
  return {
    ...authHeaders,
    ...headers
  }
}
