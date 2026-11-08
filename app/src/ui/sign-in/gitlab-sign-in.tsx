import * as React from 'react'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogContent, DialogFooter, DialogError } from '../dialog'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { TextBox } from '../lib/text-box'
import { Row } from '../lib/row'
import { LinkButton } from '../lib/link-button'
import { Account } from '../../models/account'
import { GitLabAPI, getGitLabAPIEndpoint, DefaultGitLabHTMLURL } from '../../lib/gitlab-api'

interface IGitLabSignInProps {
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
  readonly initialEndpoint?: string
}

interface IGitLabSignInState {
  readonly endpoint: string
  readonly token: string
  readonly loading: boolean
  readonly error: Error | null
}

export class GitLabSignIn extends React.Component<
  IGitLabSignInProps,
  IGitLabSignInState
> {
  public constructor(props: IGitLabSignInProps) {
    super(props)

    this.state = {
      endpoint: props.initialEndpoint || DefaultGitLabHTMLURL,
      token: '',
      loading: false,
      error: null,
    }
  }

  private onEndpointChanged = (endpoint: string) => {
    this.setState({ endpoint })
  }

  private onTokenChanged = (token: string) => {
    this.setState({ token })
  }

  private onOpenTokenPage = () => {
    const rawEndpoint = this.state.endpoint.trim().replace(/\/+$/, '')
    let base = rawEndpoint.length > 0 ? rawEndpoint : DefaultGitLabHTMLURL
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`
    }
    const tokenUrl = `${base}/-/profile/personal_access_tokens?name=Usagi&scopes=api,read_api,read_user,read_repository,write_repository`
    this.props.dispatcher.openInBrowser(tokenUrl)
  }

  private onSubmit = async () => {
    const { endpoint, token } = this.state
    const trimmedEndpoint = endpoint.trim() || DefaultGitLabHTMLURL
    const trimmedToken = token.trim()

    if (trimmedToken.length === 0) {
      this.setState({
        error: new Error('Please enter a Personal Access Token.'),
      })
      return
    }

    this.setState({ loading: true, error: null })

    try {
      const api = new GitLabAPI(trimmedEndpoint, trimmedToken)
      const user = await api.getUser()

      const apiEndpoint = getGitLabAPIEndpoint(trimmedEndpoint)
      const emails = user.email
        ? [
            {
              email: user.email,
              verified: true,
              primary: true,
              visibility: 'public' as const,
            },
          ]
        : []

      const account = new Account(
        user.username,
        apiEndpoint,
        trimmedToken,
        emails,
        user.avatar_url,
        user.id,
        user.name || user.username
      )

      await this.props.dispatcher.addAccount(account)
      this.props.onDismissed()
    } catch (e) {
      this.setState({
        loading: false,
        error:
          e instanceof Error
            ? e
            : new Error('Failed to authenticate with GitLab. Please check your token.'),
      })
    }
  }

  public render() {
    return (
      <Dialog
        id="gitlab-sign-in"
        title="Sign in to GitLab"
        onDismissed={this.props.onDismissed}
        onSubmit={this.onSubmit}
        loading={this.state.loading}
        disabled={this.state.loading}
      >
        <DialogContent>
          {this.state.error && (
            <DialogError>{this.state.error.message}</DialogError>
          )}

          <Row>
            <TextBox
              label="GitLab Host URL"
              placeholder="https://gitlab.com"
              value={this.state.endpoint}
              onValueChanged={this.onEndpointChanged}
              disabled={this.state.loading}
            />
          </Row>

          <Row>
            <TextBox
              label="Personal Access Token"
              placeholder="glpat-..."
              value={this.state.token}
              type="password"
              onValueChanged={this.onTokenChanged}
              disabled={this.state.loading}
            />
          </Row>

          <p className="secondary-text">
            Required scopes:{' '}
            <code>read_api</code>, <code>read_user</code>,{' '}
            <code>read_repository</code>, <code>write_repository</code>.
          </p>

          <p>
            <LinkButton onClick={this.onOpenTokenPage}>
              Generate a Personal Access Token on GitLab
            </LinkButton>
          </p>
        </DialogContent>

        <DialogFooter>
          <OkCancelButtonGroup
            okButtonText="Sign In"
            okButtonDisabled={this.state.loading || this.state.token.trim().length === 0}
            cancelButtonDisabled={this.state.loading}
          />
        </DialogFooter>
      </Dialog>
    )
  }
}
