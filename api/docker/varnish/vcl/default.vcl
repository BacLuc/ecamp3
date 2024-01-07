vcl 4.0;

import std;
import xkey;
import cookie;
import var;

include "./_config.vcl";
include "./fos_tags_xkey.vcl";
include "./fos_debug.vcl";

sub vcl_recv {

  var.set("originalUrl", req.http.X-Forwarded-Prefix + req.url);

  if(var.get("originalUrl") ~ "^/api/varnish/healthcheck") {
    return(synth(200,"OK"));
  }

  # Support xkey purge requests
  # see https://raw.githubusercontent.com/varnish/varnish-modules/master/src/vmod_xkey.vcc
  call fos_tags_xkey_recv;
  
  # exclude other services (frontend, print, etc.)
  if (var.get("originalUrl") !~ "^/api") {
    return(pass);
  }

  # exclude API documentation, profiler and graphql endpoint
  if (var.get("originalUrl") ~ "^/api/docs" 
    || var.get("originalUrl") ~ "^/api/graphql" 
    || var.get("originalUrl") ~ "^/api/bundles" 
    || var.get("originalUrl") ~ "^/api/contexts" 
    || var.get("originalUrl") ~ "^/api/_profiler" 
    || var.get("originalUrl") ~ "^/api/_wdt") {
    return(pass);
  }

  # exclude any format other than HAL
  if (req.url !~ "\.jsonhal$" && req.http.Accept !~ "application/hal\+json"){
    return(pass);
  }
}

sub vcl_hash {
  if (req.http.Cookie) {
    # Include JWT cookies in cache hash 
    cookie.parse(req.http.Cookie);
    cookie.keep("localhost_jwt_hp,localhost_jwt_s");
    hash_data(cookie.get_string());
  }

  # using URL (=path), but not using Host/ServerIP; this allows to share cache between print & normal API calls
  hash_data(req.url);

  return(lookup);
}

sub vcl_req_cookie {
  # Varnish by default disables caching whenever the request header "Cookie" is set in the request (default safe behavior)
  # this bypasses the default behaviour; this is safe because we included "Cookie" in the "Vary" header
  return (hash);
}

sub vcl_backend_response {
  if (bereq.uncacheable) {
    return (deliver);
  }
  call vcl_beresp_stale;

  # Varnish by default disables caching whenever the reponse header "Set-Cookie" is set in the request (default safe behavior)
  # commenting the following line bypasses the default behaviour
  # call vcl_beresp_cookie;

  call vcl_beresp_control;
  call vcl_beresp_vary;
  return (deliver);
}

sub vcl_deliver {
  call fos_tags_xkey_deliver;
  call fos_debug_deliver;

  # reset cache control header to avoid caching by any other upstream proxies
  if (resp.http.Content-Type ~ "application/hal\+json"){
    set resp.http.Cache-Control = "no-cache, private";
  }
}

