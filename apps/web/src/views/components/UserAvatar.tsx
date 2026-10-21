import { useState } from 'react'
import { UserRound } from 'lucide-react'
import type { AccountView } from '../../presenters/app/shell.presenter.js'

export function UserAvatar({ account, size }: { account: AccountView; size?: 'small' | 'large' }) {
  const [failed, setFailed] = useState<string>()
  const className = 'user-avatar' + (size ? ` user-avatar-${size}` : '')

  if (account.photoUrl && failed !== account.photoUrl)
    return (
      <img
        className={className}
        src={account.photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(account.photoUrl)}
      />
    )

  return (
    <span className={className} aria-hidden="true">
      <UserRound size={size === 'large' ? 32 : 15} />
    </span>
  )
}
