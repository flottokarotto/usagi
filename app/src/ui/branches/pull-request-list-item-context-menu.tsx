import { IMenuItem } from '../../lib/menu-item'

interface IPullRequestContextMenuConfig {
  onViewPullRequestOnGitHub?: () => void
  onCheckoutInNewWorktree?: () => void
  isGitLab?: boolean
}

export function generatePullRequestContextMenuItems(
  config: IPullRequestContextMenuConfig
): IMenuItem[] {
  const { onViewPullRequestOnGitHub, onCheckoutInNewWorktree, isGitLab } = config
  const items = new Array<IMenuItem>()

  if (onViewPullRequestOnGitHub !== undefined) {
    items.push({
      label: isGitLab
        ? 'View Merge Request on GitLab'
        : 'View Pull Request on GitHub',
      action: () => onViewPullRequestOnGitHub(),
    })
  }

  if (onCheckoutInNewWorktree !== undefined) {
    items.push({
      label: __DARWIN__
        ? 'Checkout in New Worktree…'
        : 'Checkout in new worktree…',
      action: () => onCheckoutInNewWorktree(),
    })
  }

  return items
}
