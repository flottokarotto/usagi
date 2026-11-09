import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Account } from '../../src/models/account'
import { ApiRepositoriesStore } from '../../src/lib/stores/api-repositories-store'
import { AccountsStore } from '../../src/lib/stores/accounts-store'
import { InMemoryStore, AsyncInMemoryStore } from '../helpers/stores'

describe('ApiRepositoriesStore', () => {
  it('loads repositories for a GitLab account', async () => {
    const originalFetch = globalThis.fetch
    try {
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const urlStr = input.toString()
        if (urlStr.includes('/api/v4/projects')) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                id: 123,
                name: 'test-project',
                path: 'test-project',
                name_with_namespace: 'User / test-project',
                path_with_namespace: 'user/test-project',
                description: 'A test project',
                default_branch: 'main',
                ssh_url_to_repo: 'git@gitlab.com:user/test-project.git',
                http_url_to_repo: 'https://gitlab.com/user/test-project.git',
                web_url: 'https://gitlab.com/user/test-project',
                visibility: 'private',
                archived: false,
              },
            ],
          } as unknown as Response
        }
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as unknown as Response
      }

      const accountsStore = new AccountsStore(
        new InMemoryStore(),
        new AsyncInMemoryStore()
      )
      const store = new ApiRepositoriesStore(accountsStore)
      const gitLabAccount = new Account(
        'user',
        'https://gitlab.com/api/v4',
        'glpat-fake-token',
        [],
        '',
        1,
        'User'
      )

      await store.loadRepositories(gitLabAccount)

      const state = store.getState().get(gitLabAccount)
      assert.notStrictEqual(state, undefined)
      assert.strictEqual(state?.loading, false)
      assert.strictEqual(state?.repositories.length, 1)
      assert.strictEqual(state?.repositories[0].name, 'test-project')
      assert.strictEqual(state?.repositories[0].owner.login, 'user')
      assert.strictEqual(
        state?.repositories[0].clone_url,
        'https://gitlab.com/user/test-project.git'
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
