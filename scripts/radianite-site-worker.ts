const sitePrefix = "/radianite"

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === `${sitePrefix}/`) {
      url.pathname = sitePrefix
      return Response.redirect(url, 308)
    }

    if (
      url.pathname !== sitePrefix &&
      !url.pathname.startsWith(`${sitePrefix}/`)
    ) {
      return new Response("Not found", { status: 404 })
    }

    url.pathname = url.pathname.slice(sitePrefix.length) || "/"
    return env.ASSETS.fetch(new Request(url, request))
  },
}
