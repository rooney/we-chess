type DataUpdater<T> = (data: T) => T
type WorkItem<T> = {
  begin: () => T
  end: (data: T) => void
  data?: T
}

export class WorkQueue<T> {
  private queue: Array<WorkItem<T>>
  constructor() {
    this.queue = []
  }

  public push(work: WorkItem<T>) {
    this.queue.push(work)
    if (this.queue.length === 1) this.next()
  }

  public pop(): WorkItem<T> {
    const workitem = this.queue.shift() as WorkItem<T>
    workitem.end(workitem.data as T)
    if (this.queue.length > 0) this.next()
    return workitem
  }

  private next() {
    if (this.queue.length === 0) return
    this.queue[0].data = this.queue[0].begin()
  }

  public update(fn: DataUpdater<T>) {
    this.queue[0].data = fn(this.queue[0].data as T)
  }
}