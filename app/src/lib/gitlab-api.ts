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
  const trimmed = baseURL.trim().replace(/\/+$/, '')
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
      throw new Error(
        `GitLab API request failed (${response.status} ${response.statusText}): ${url.toString()}`
      )
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
