import assert from 'node:assert/strict'
import { test } from '@jest/globals'
import { NoticePresenter } from '../../src/presenters/app/notice.presenter.js'

test('shows a notice and dismisses it after the scheduled duration', () => {
  let scheduled: (() => void) | undefined
  let delay = 0
  let cancelled = false
  const notices = new NoticePresenter(
    {
      schedule: (task, milliseconds) => {
        scheduled = task
        delay = milliseconds
        return () => {
          cancelled = true
        }
      },
    },
    25,
  )

  notices.show('Saved')

  assert.deepEqual(notices.getSnapshot(), { message: 'Saved', error: false })
  assert.equal(delay, 25)
  scheduled?.()
  assert.equal(notices.getSnapshot(), null)
  assert.equal(cancelled, true)
})
