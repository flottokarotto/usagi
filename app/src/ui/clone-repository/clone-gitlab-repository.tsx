import * as React from 'react'
import { Account, isGitLabAccount } from '../../models/account'
import { DialogContent } from '../dialog'
import { TextBox } from '../lib/text-box'
import { Row } from '../lib/row'
import { Button } from '../lib/button'
import { CallToAction } from '../lib/call-to-action'
import { Dispatcher } from '../dispatcher'
import { GitLabAPI, IGitLabProject } from '../../lib/gitlab-api'
import { IAPIRepository } from '../../lib/api'
import { CloneableRepositoryFilterList } from './cloneable-repository-filter-list'
import { ClickSource } from '../lib/list'

interface ICloneGitLabRepositoryProps {
  readonly accounts: ReadonlyArray<Account>
  readonly path: string
  readonly onPathChanged: (path: string) => void
  readonly onChooseDirectory: () => Promise<string | undefined>
  readonly selectedItem: IAPIRepository | null
  readonly onSelectionChanged: (selectedItem: IAPIRepository | null) => void
  readonly dispatcher: Dispatcher
}

interface ICloneGitLabRepositoryState {
  readonly selectedAccount: Account | null
  readonly repositories: ReadonlyArray<IAPIRepository> | null
  readonly loading: boolean
  readonly filterText: string
  readonly error: string | null
}

function gitLabProjectToAPIRepository(
  project: IGitLabProject,
  endpoint: string
): IAPIRepository {
  const parts = project.path_with_namespace.split('/')
  const ownerLogin = parts.length > 1 ? parts.slice(0, -1).join('/') : 'gitlab'

  return {
    clone_url: project.http_url_to_repo,
    ssh_url: project.ssh_url_to_repo,
    html_url: project.web_url,
    name: project.name_with_namespace,
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

export class CloneGitLabRepository extends React.Component<
  ICloneGitLabRepositoryProps,
  ICloneGitLabRepositoryState
> {
  public constructor(props: ICloneGitLabRepositoryProps) {
    super(props)

    const gitLabAccounts = props.accounts.filter(isGitLabAccount)
    const selectedAccount = gitLabAccounts.length > 0 ? gitLabAccounts[0] : null

    this.state = {
      selectedAccount,
      repositories: null,
      loading: false,
      filterText: '',
      error: null,
    }
  }

  public componentDidMount() {
    if (this.state.selectedAccount) {
      this.loadRepositories(this.state.selectedAccount)
    }
  }

  public componentDidUpdate(prevProps: ICloneGitLabRepositoryProps) {
    if (prevProps.accounts !== this.props.accounts) {
      const gitLabAccounts = this.props.accounts.filter(isGitLabAccount)
      const current = this.state.selectedAccount
      if (!current || !gitLabAccounts.some(a => a.id === current.id)) {
        const next = gitLabAccounts[0] || null
        this.setState({ selectedAccount: next })
        if (next) {
          this.loadRepositories(next)
        }
      }
    }
  }

  private loadRepositories = async (account: Account) => {
    this.setState({ loading: true, error: null })

    try {
      const api = new GitLabAPI(account.endpoint, account.token)
      const projects = await api.getProjects(1, 100)
      const repositories = projects.map(p =>
        gitLabProjectToAPIRepository(p, account.endpoint)
      )
      this.setState({ repositories, loading: false })
    } catch (e) {
      this.setState({
        loading: false,
        error:
          e instanceof Error
            ? e.message
            : 'Failed to load projects from GitLab',
      })
    }
  }

  private onFilterTextChanged = (filterText: string) => {
    this.setState({ filterText })
  }

  private onSignIn = () => {
    this.props.dispatcher.showGitLabSignInDialog()
  }

  private onRefresh = () => {
    if (this.state.selectedAccount) {
      this.loadRepositories(this.state.selectedAccount)
    }
  }

  private onItemClicked = (
    repository: IAPIRepository,
    source: ClickSource
  ) => {
    this.props.onSelectionChanged(repository)
  }

  public render() {
    const gitLabAccounts = this.props.accounts.filter(isGitLabAccount)

    if (gitLabAccounts.length === 0) {
      return (
        <DialogContent className="clone-github-repo-content">
          <CallToAction
            actionTitle="Sign into GitLab"
            onAction={this.onSignIn}
          >
            <div>
              Sign in to GitLab.com or your self-hosted GitLab instance to access your projects.
            </div>
          </CallToAction>
        </DialogContent>
      )
    }

    return (
      <DialogContent className="clone-github-repo-content">
        <Row>
          <CloneableRepositoryFilterList
            account={this.state.selectedAccount!}
            selectedItem={this.props.selectedItem}
            onSelectionChanged={this.props.onSelectionChanged}
            repositories={this.state.repositories}
            loading={this.state.loading}
            filterText={this.state.filterText}
            onFilterTextChanged={this.onFilterTextChanged}
            onRefreshRepositories={this.onRefresh}
            onItemClicked={this.onItemClicked}
          />
        </Row>

        <Row className="clone-destination">
          <TextBox
            value={this.props.path}
            label="Local path"
            placeholder="repository path"
            onValueChanged={this.props.onPathChanged}
          />
          <Button onClick={this.props.onChooseDirectory}>Choose…</Button>
        </Row>
      </DialogContent>
    )
  }
}
