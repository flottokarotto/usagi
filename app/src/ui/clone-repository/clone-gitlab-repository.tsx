import * as React from 'react'
import { Account, isGitLabAccount } from '../../models/account'
import { DialogContent, DialogError } from '../dialog'
import { TextBox } from '../lib/text-box'
import { Select } from '../lib/select'
import { Row } from '../lib/row'
import { Button } from '../lib/button'
import { CallToAction } from '../lib/call-to-action'
import { Dispatcher } from '../dispatcher'
import { GitLabAPI, gitLabProjectToAPIRepository } from '../../lib/gitlab-api'
import { IAPIRepository } from '../../lib/api'
import { CloneableRepositoryFilterList } from './cloneable-repository-filter-list'
import { ClickSource } from '../lib/list'

interface ICloneGitLabRepositoryProps {
  readonly account?: Account | null
  readonly accounts: ReadonlyArray<Account>
  readonly path: string
  readonly onPathChanged: (path: string) => void
  readonly onChooseDirectory: () => Promise<string | undefined>
  readonly selectedItem: IAPIRepository | null
  readonly onSelectionChanged: (selectedItem: IAPIRepository | null) => void
  readonly repositories?: ReadonlyArray<IAPIRepository> | null
  readonly loading?: boolean
  readonly filterText?: string
  readonly onFilterTextChanged?: (filterText: string) => void
  readonly onRefreshRepositories?: (account: Account) => void
  readonly onItemClicked?: (
    repository: IAPIRepository,
    source: ClickSource
  ) => void
  readonly onSelectedAccountChanged?: (account: Account) => void
  readonly dispatcher: Dispatcher
}

interface ICloneGitLabRepositoryState {
  readonly selectedAccount: Account | null
  readonly repositories: ReadonlyArray<IAPIRepository> | null
  readonly loading: boolean
  readonly filterText: string
  readonly error: string | null
}

export class CloneGitLabRepository extends React.Component<
  ICloneGitLabRepositoryProps,
  ICloneGitLabRepositoryState
> {
  public constructor(props: ICloneGitLabRepositoryProps) {
    super(props)

    const gitLabAccounts = props.accounts.filter(isGitLabAccount)
    const selectedAccount =
      props.account ?? (gitLabAccounts.length > 0 ? gitLabAccounts[0] : null)

    this.state = {
      selectedAccount,
      repositories: null,
      loading: false,
      filterText: '',
      error: null,
    }
  }

  public componentDidMount() {
    if (this.props.repositories === undefined && this.state.selectedAccount) {
      this.loadRepositories(this.state.selectedAccount)
    }
  }

  public componentDidUpdate(prevProps: ICloneGitLabRepositoryProps) {
    if (prevProps.account !== this.props.account && this.props.account) {
      this.setState({ selectedAccount: this.props.account })
      if (this.props.repositories === undefined) {
        this.loadRepositories(this.props.account)
      }
    } else if (prevProps.accounts !== this.props.accounts) {
      const gitLabAccounts = this.props.accounts.filter(isGitLabAccount)
      const current = this.state.selectedAccount
      if (!current || !gitLabAccounts.some(a => a.id === current.id)) {
        const next = gitLabAccounts[0] || null
        this.setState({ selectedAccount: next })
        if (next && this.props.repositories === undefined) {
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
    if (this.props.onFilterTextChanged) {
      this.props.onFilterTextChanged(filterText)
    } else {
      this.setState({ filterText })
    }
  }

  private onSignIn = () => {
    this.props.dispatcher.showGitLabSignInDialog()
  }

  private onRefresh = () => {
    const account = this.state.selectedAccount
    if (!account) {
      return
    }

    if (this.props.onRefreshRepositories) {
      this.props.onRefreshRepositories(account)
    } else {
      this.loadRepositories(account)
    }
  }

  private onItemClicked = (repository: IAPIRepository, source: ClickSource) => {
    if (this.props.onItemClicked) {
      this.props.onItemClicked(repository, source)
    } else {
      this.props.onSelectionChanged(repository)
    }
  }

  private onAccountChanged = (event: React.FormEvent<HTMLSelectElement>) => {
    const key = event.currentTarget.value
    const gitLabAccounts = this.props.accounts.filter(isGitLabAccount)
    const nextAccount =
      gitLabAccounts.find(a => `${a.endpoint}:${a.login}` === key) ?? null
    this.setState({ selectedAccount: nextAccount })
    if (nextAccount) {
      this.props.onSelectedAccountChanged?.(nextAccount)
      if (this.props.repositories === undefined) {
        this.loadRepositories(nextAccount)
      }
    }
  }

  public render() {
    const gitLabAccounts = this.props.accounts.filter(isGitLabAccount)

    if (gitLabAccounts.length === 0) {
      return (
        <DialogContent className="clone-github-repo-content">
          <CallToAction actionTitle="Sign into GitLab" onAction={this.onSignIn}>
            <div>
              Sign in to GitLab.com or your self-hosted GitLab instance to
              access your projects.
            </div>
          </CallToAction>
        </DialogContent>
      )
    }

    const repositories =
      this.props.repositories !== undefined
        ? this.props.repositories
        : this.state.repositories
    const loading =
      this.props.loading !== undefined ? this.props.loading : this.state.loading
    const filterText =
      this.props.filterText !== undefined
        ? this.props.filterText
        : this.state.filterText

    return (
      <DialogContent className="clone-github-repo-content">
        {this.state.error && <DialogError>{this.state.error}</DialogError>}
        {gitLabAccounts.length > 1 && (
          <Row>
            <Select
              label="GitLab account"
              value={`${this.state.selectedAccount?.endpoint}:${this.state.selectedAccount?.login}`}
              onChange={this.onAccountChanged}
            >
              {gitLabAccounts.map(account => (
                <option
                  key={`${account.endpoint}:${account.login}`}
                  value={`${account.endpoint}:${account.login}`}
                >
                  {account.friendlyEndpoint} — @{account.login} (
                  {account.friendlyName})
                </option>
              ))}
            </Select>
          </Row>
        )}
        <Row>
          <CloneableRepositoryFilterList
            account={this.state.selectedAccount!}
            selectedItem={this.props.selectedItem}
            onSelectionChanged={this.props.onSelectionChanged}
            repositories={repositories}
            loading={loading}
            filterText={filterText}
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
