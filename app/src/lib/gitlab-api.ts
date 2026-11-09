import { Account, isGitLabAccount } from '../models/account'
import { parseRemote } from './remote-parsing'
import { getHTMLURL, IAPIRepository } from './api'

export const DefaultGitLabEndpoint = 'https://gitlab.com/api/v4'
export const DefaultGitLabHTMLURL = 'https://gitlab.com'

export interface IGitLabUser {
  readonly id: number
  readonly username: string
  readonly name: string
  readonly avatar_url: string
  readonly email?: string
  readonly web_url: string
}

export interface IGitLabProject {
  readonly id: number
  readonly name: string
  readonly path: string
  readonly name_with_namespace: string
  readonly path_with_namespace: string
  readonly description: string | null
  readonly default_branch: string
  readonly ssh_url_to_repo: string
  readonly http_url_to_repo: string
  readonly web_url: string
  readonly visibility: 'private' | 'internal' | 'public'
  readonly forked_from_project?: {
    readonly id: number
    readonly path_with_namespace: string
  }
  readonly archived: boolean
}

export interface IGitLabMergeRequest {
  readonly id: number
  readonly iid: number
  readonly project_id: number
  readonly title: string
  readonly description: string | null
  readonly state: 'opened' | 'closed' | 'locked' | 'merged'
  readonly created_at: string
  readonly updated_at: string
  readonly target_branch: string
  readonly source_branch: string
  readonly web_url: string
  readonly draft?: boolean
  readonly work_in_progress?: boolean
  readonly author: {
    readonly id: number
    readonly username: string
    readonly name: string
    readonly avatar_url: string
  }
}

export interface IGitLabCommitStatus {
  readonly id: number
  readonly sha: string
  readonly status:
    | 'pending'
    | 'running'
    | 'success'
    | 'failed'
    | 'canceled'
    | 'skipped'
    | 'manual'
  readonly name: string
  readonly description: string | null
  readonly target_url: string | null
}

export function getGitLabAPIEndpoint(baseURL = DefaultGitLabHTMLURL): string {
  let trimmed = baseURL.trim().replace(/\/+$/, '')
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`
  }
  return trimmed.endsWith('/api/v4') ? trimmed : `${trimmed}/api/v4`
}

export function isGitLabEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    return (
      url.hostname === 'gitlab.com' ||
      url.pathname.includes('/api/v4') ||
      url.hostname.includes('gitlab')
    )
  } catch {
    return false
  }
}

export function isGitLabRemoteURL(
  remoteUrl: string,
  accounts?: ReadonlyArray<Account>
): boolean {
  if (
    remoteUrl.includes('gitlab.com') ||
    remoteUrl.toLowerCase().includes('gitlab')
  ) {
    return true
  }

  if (accounts) {
    const parsed = parseRemote(remoteUrl)
    if (parsed) {
      return accounts.some(a => {
        if (!isGitLabAccount(a)) {
          return false
        }
        try {
          return (
            new URL(getHTMLURL(a.endpoint)).hostname.toLowerCase() ===
            parsed.hostname.toLowerCase()
          )
        } catch {
          return false
        }
      })
    }
  }

  return false
}

/**
 * Convert a git remote URL (SSH or HTTPS) for a GitLab repository into
 * its browser web URL.
 * e.g. git@gitlab.com:group/subgroup/project.git -> https://gitlab.com/group/subgroup/project
 * e.g. https://gitlab.example.com/group/project.git -> https://gitlab.example.com/group/project
 * e.g. ssh://git@gitlab.example.com:2222/group/project.git -> https://gitlab.example.com/group/project
 */
export function getGitLabWebURLFromRemoteURL(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim().replace(/\.git\/?$/, '')

  const standardSshMatch = /^git@([^:]+):(.+)$/.exec(trimmed)
  if (standardSshMatch) {
    const host = standardSshMatch[1]
    const path = standardSshMatch[2]
    return `https://${host}/${path.replace(/^\/+/, '')}`
  }

  const customSshMatch = /^ssh:\/\/(?:.+@)?([^/:]+)(?::\d+)?\/(.+)$/.exec(
    trimmed
  )
  if (customSshMatch) {
    const host = customSshMatch[1]
    const path = customSshMatch[2]
    return `https://${host}/${path.replace(/^\/+/, '')}`
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `${url.origin}${url.pathname}`
    }
    return `https://${url.hostname}${url.pathname}`
  } catch {
    return null
  }
}

/**
 * Generate the web URL to open the GitLab page for creating a new Merge Request.
 */
export function getGitLabCreateMergeRequestURL(
  webUrl: string,
  sourceBranch: string,
  targetBranch?: string
): string {
  const base = webUrl.replace(/\/+$/, '')
  let url = `${base}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(
    sourceBranch
  )}`
  if (targetBranch) {
    url += `&merge_request%5Btarget_branch%5D=${encodeURIComponent(
      targetBranch
    )}`
  }
  return url
}

export class GitLabAPI {
  private readonly endpoint: string
  private readonly token: string

  public constructor(endpoint: string, token: string) {
    this.endpoint = getGitLabAPIEndpoint(endpoint)
    this.token = token.trim()
  }

  private async request<T>(
    path: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    const trimmedPath = path.startsWith('/') ? path.slice(1) : path
    const url = new URL(`${this.endpoint}/${trimmedPath}`)

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'UsagiDesktop',
      'PRIVATE-TOKEN': this.token,
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      let detail = ''
      try {
        const errJson: any = await response.json()
        detail =
          errJson.message ||
          errJson.error_description ||
          errJson.error ||
          JSON.stringify(errJson)
      } catch {
        detail = response.statusText
      }
      if (response.status === 403 && !detail.toLowerCase().includes('scope')) {
        detail += ' (check that your token has read_api or api scope)'
      }
      throw new Error(`GitLab API error (${response.status}): ${detail}`)
    }

    return (await response.json()) as T
  }

  /** Fetch current authenticated user */
  public async getUser(): Promise<IGitLabUser> {
    return this.request<IGitLabUser>('user')
  }

  /** Fetch projects accessible by user */
  public async getProjects(
    page = 1,
    perPage = 100
  ): Promise<ReadonlyArray<IGitLabProject>> {
    return this.request<ReadonlyArray<IGitLabProject>>('projects', {
      membership: true,
      simple: true,
      per_page: perPage,
      page,
      order_by: 'last_activity_at',
    })
  }

  /**
   * Fetch accessible projects in a streaming fashion, calling the callback
   * with each page.
   */
  public async streamUserProjects(
    callback: (projects: ReadonlyArray<IGitLabProject>) => void,
    maxPages = 10
  ): Promise<void> {
    let page = 1
    const perPage = 100

    while (page <= maxPages) {
      const projects = await this.getProjects(page, perPage)
      if (projects.length === 0) {
        break
      }
      callback(projects)
      if (projects.length < perPage) {
        break
      }
      page++
    }
  }

  /** Fetch a specific project by id or url-encoded path (e.g. 'group/project') */
  public async getProject(
    projectPathOrId: string | number
  ): Promise<IGitLabProject | null> {
    try {
      const encoded = encodeURIComponent(projectPathOrId)
      return await this.request<IGitLabProject>(`projects/${encoded}`)
    } catch {
      return null
    }
  }

  /** Fetch merge requests for a project */
  public async getMergeRequests(
    projectPathOrId: string | number,
    state: 'opened' | 'closed' | 'merged' = 'opened'
  ): Promise<ReadonlyArray<IGitLabMergeRequest>> {
    const encoded = encodeURIComponent(projectPathOrId)
    return this.request<ReadonlyArray<IGitLabMergeRequest>>(
      `projects/${encoded}/merge_requests`,
      { state, per_page: 50 }
    )
  }

  /** Fetch commit pipeline statuses */
  public async getCommitStatuses(
    projectPathOrId: string | number,
    sha: string
  ): Promise<ReadonlyArray<IGitLabCommitStatus>> {
    const encoded = encodeURIComponent(projectPathOrId)
    return this.request<ReadonlyArray<IGitLabCommitStatus>>(
      `projects/${encoded}/repository/commits/${sha}/statuses`
    )
  }
}

/**
 * Convert a GitLab project to an IAPIRepository suitable for Desktop's repository lists and clone flows.
 */
export function gitLabProjectToAPIRepository(
  project: IGitLabProject,
  endpoint: string
): IAPIRepository {
  const parts = project.path_with_namespace.split('/')
  const ownerLogin = parts.length > 1 ? parts.slice(0, -1).join('/') : 'gitlab'

  return {
    clone_url: project.http_url_to_repo,
    ssh_url: project.ssh_url_to_repo,
    html_url: project.web_url,
    name: project.path,
    owner: {
      id: project.id,
      login: ownerLogin,
      avatar_url: '',
      type: 'User',
      html_url: project.web_url,
    },
    private: project.visibility === 'private',
    fork: project.forked_from_project !== undefined,
    default_branch: project.default_branch || 'main',
    pushed_at: '',
    has_issues: true,
    archived: project.archived,
  }
}
