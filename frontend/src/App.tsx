import {
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  FileBarChart,
  Home,
  KeyRound,
  Lock,
  Megaphone,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Soup,
  TicketCheck,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import './App.css'

type Role = 'Super Admin' | 'House Admin' | 'Assistant Admin' | 'Member'
type ModuleKey =
  | 'dashboard'
  | 'members'
  | 'rooms'
  | 'expenses'
  | 'meals'
  | 'notices'
  | 'tickets'
  | 'reports'
  | 'security'

const modules: Array<{ key: ModuleKey; label: string; icon: typeof Home }> = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'members', label: 'Members', icon: Users },
  { key: 'rooms', label: 'Rooms', icon: DoorOpen },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
  { key: 'meals', label: 'Meals', icon: Soup },
  { key: 'notices', label: 'Notices', icon: Bell },
  { key: 'tickets', label: 'Tickets', icon: TicketCheck },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
  { key: 'security', label: 'Security', icon: ShieldCheck },
]

const rolePermissions: Record<Role, string[]> = {
  'Super Admin': ['Create houses', 'Manage moderators', 'Subscriptions', 'System analytics'],
  'House Admin': ['Members', 'Rooms', 'Expenses', 'Notices', 'WhatsApp', 'Reports'],
  'Assistant Admin': ['Members', 'Rooms', 'Create expenses', 'Create notices', 'View reports'],
  Member: ['Dashboard', 'Notices', 'Expense summary', 'Meal summary', 'Maintenance tickets'],
}

const houses = [
  { name: 'Green Villa', slug: 'green-villa', plan: 'Pro', members: 84, status: 'Active', storage: 138 },
  { name: 'Royal Mess', slug: 'royal-mess', plan: 'Basic', members: 27, status: 'Active', storage: 32 },
  { name: 'House 101', slug: 'house-101', plan: 'Free', members: 14, status: 'Review', storage: 8 },
]

const stats = [
  { label: 'Total Houses', value: '128', change: '+12 this month', icon: Building2 },
  { label: 'Active Members', value: '4,820', change: '96.4% active', icon: Users },
  { label: 'Monthly Expenses', value: 'BDT 2.8M', change: 'Across all tenants', icon: BadgeDollarSign },
  { label: 'Storage Used', value: '18.6 GB', change: 'Cloudinary metadata only', icon: ClipboardList },
]

const members = [
  { name: 'Arif Hasan', room: 'A-101', status: 'Active', meals: 62.5, due: 'BDT 4,250' },
  { name: 'Nusrat Jahan', room: 'A-102', status: 'Active', meals: 58, due: 'BDT 3,980' },
  { name: 'Tanvir Ahmed', room: 'B-201', status: 'Suspended', meals: 12, due: 'BDT 1,120' },
  { name: 'Maliha Rahman', room: 'B-203', status: 'Active', meals: 65, due: 'BDT 4,410' },
]

const roomRows = [
  { room: 'A-101', capacity: 4, occupied: 4, status: 'Full' },
  { room: 'A-102', capacity: 3, occupied: 2, status: 'Available' },
  { room: 'B-201', capacity: 2, occupied: 1, status: 'Available' },
  { room: 'B-203', capacity: 3, occupied: 3, status: 'Full' },
]

const expenseRows = [
  { category: 'Meal', amount: 'BDT 84,500', date: 'Jun 20', recurring: 'No' },
  { category: 'Electricity', amount: 'BDT 18,200', date: 'Jun 18', recurring: 'Monthly' },
  { category: 'Internet', amount: 'BDT 3,500', date: 'Jun 10', recurring: 'Monthly' },
  { category: 'Maintenance', amount: 'BDT 9,850', date: 'Jun 06', recurring: 'No' },
]

const notices = [
  { title: 'Meal off deadline moved to 10 PM', type: 'Meal Notice', priority: 'High' },
  { title: 'Generator service on Friday', type: 'Maintenance', priority: 'Medium' },
  { title: 'June expense report published', type: 'General', priority: 'Normal' },
]

const tickets = [
  { title: 'Bathroom tap leakage', member: 'Arif Hasan', status: 'In Progress' },
  { title: 'Wi-Fi weak in B block', member: 'Maliha Rahman', status: 'Open' },
  { title: 'Room fan replacement', member: 'Nusrat Jahan', status: 'Resolved' },
]

function App() {
  const [role, setRole] = useState<Role>('House Admin')
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeHouse = houses[0]
  const visibleModules = useMemo(() => {
    if (role === 'Member') {
      return modules.filter((item) => ['dashboard', 'meals', 'notices', 'tickets', 'reports'].includes(item.key))
    }
    if (role === 'Super Admin') {
      return modules.filter((item) => ['dashboard', 'members', 'reports', 'security'].includes(item.key))
    }
    return modules
  }, [role])

  const ActiveIcon = modules.find((item) => item.key === activeModule)?.icon || Home

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-block">
          <div className="brand-mark">HM</div>
          <div>
            <strong>House Management Pro</strong>
            <span>Multi-tenant SaaS</span>
          </div>
          <button className="icon-button mobile-only" type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="tenant-card">
          <div className="tenant-cover">
            <Building2 size={22} />
          </div>
          <strong>{activeHouse.name}</strong>
          <span>/{activeHouse.slug}</span>
          <div className="tenant-meta">
            <b>{activeHouse.plan}</b>
            <b>{activeHouse.status}</b>
          </div>
        </div>

        <nav className="module-nav" aria-label="Application modules">
          {visibleModules.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activeModule === item.key ? 'active' : ''}
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveModule(item.key)
                  setSidebarOpen(false)
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="security-card">
          <ShieldCheck size={18} />
          <div>
            <strong>Tenant isolation enforced</strong>
            <span>houseId filtered APIs, RBAC, JWT rotation, audit logs</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="search-box">
            <Search size={18} />
            <input aria-label="Search HMS" placeholder="Search members, rooms, notices, tickets" />
          </div>
          <div className="role-switcher" aria-label="Role preview">
            {(Object.keys(rolePermissions) as Role[]).map((item) => (
              <button className={role === item ? 'selected' : ''} key={item} type="button" onClick={() => setRole(item)}>
                {item}
              </button>
            ))}
          </div>
        </header>

        <section className="page-title">
          <div>
            <span className="eyebrow">/{activeHouse.slug} tenant workspace</span>
            <h1>
              <ActiveIcon size={30} />
              {modules.find((item) => item.key === activeModule)?.label}
            </h1>
          </div>
          <div className="title-actions">
            <button className="ghost-button" type="button">
              <CalendarDays size={17} />
              June 2026
            </button>
            <button className="primary-button" type="button">
              <Plus size={17} />
              New record
            </button>
          </div>
        </section>

        {activeModule === 'dashboard' && <Dashboard role={role} />}
        {activeModule === 'members' && <MembersPanel role={role} />}
        {activeModule === 'rooms' && <RoomsPanel />}
        {activeModule === 'expenses' && <ExpensesPanel />}
        {activeModule === 'meals' && <MealsPanel />}
        {activeModule === 'notices' && <NoticesPanel />}
        {activeModule === 'tickets' && <TicketsPanel />}
        {activeModule === 'reports' && <ReportsPanel />}
        {activeModule === 'security' && <SecurityPanel role={role} />}
      </main>
    </div>
  )
}

function Dashboard({ role }: { role: Role }) {
  return (
    <>
      <section className="stats-grid">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <article className="metric-card" key={item.label}>
              <span><Icon size={20} /></span>
              <div>
                <p>{item.label}</p>
                <strong>{item.value}</strong>
                <small>{item.change}</small>
              </div>
            </article>
          )
        })}
      </section>

      <section className="content-grid">
        <div className="panel wide">
          <PanelHeader icon={Building2} title={role === 'Super Admin' ? 'House Portfolio' : 'House Operations'} action="View all" />
          <div className="house-grid">
            {houses.map((house) => (
              <article className="house-row" key={house.slug}>
                <div>
                  <strong>{house.name}</strong>
                  <span>/{house.slug}</span>
                </div>
                <b>{house.plan}</b>
                <span>{house.members} members</span>
                <StatusPill value={house.status} />
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <PanelHeader icon={KeyRound} title="Role Permissions" action={role} />
          <div className="permission-list">
            {rolePermissions[role].map((item) => (
              <span key={item}>
                <CheckCircle2 size={16} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel">
          <PanelHeader icon={Soup} title="Meal Summary" action="Dynamic rate" />
          <div className="meal-summary">
            <strong>1,248.5</strong>
            <span>Total meal points</span>
            <div className="progress-track"><i style={{ width: '78%' }} /></div>
            <small>BDT 67.67 calculated per meal from meal expenses</small>
          </div>
        </div>
        <div className="panel">
          <PanelHeader icon={DoorOpen} title="Room Occupancy" action="12 rooms" />
          <div className="occupancy">
            <b>83%</b>
            <span>31 of 37 seats occupied</span>
            <div className="room-dots">
              {Array.from({ length: 12 }).map((_, index) => <i className={index < 10 ? 'filled' : ''} key={index} />)}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function MembersPanel({ role }: { role: Role }) {
  return (
    <section className="panel">
      <PanelHeader icon={Users} title="Member Management" action={role === 'Member' ? 'Read only' : 'Add member'} />
      <DataTable
        columns={['Name', 'Room', 'Status', 'Meal count', 'Current due']}
        rows={members.map((member) => [member.name, member.room, <StatusPill value={member.status} />, member.meals, member.due])}
      />
    </section>
  )
}

function RoomsPanel() {
  return (
    <section className="panel">
      <PanelHeader icon={DoorOpen} title="Room Capacity and Assignment" action="Assign members" />
      <DataTable
        columns={['Room', 'Capacity', 'Occupied', 'Status']}
        rows={roomRows.map((room) => [room.room, room.capacity, room.occupied, <StatusPill value={room.status} />])}
      />
    </section>
  )
}

function ExpensesPanel() {
  return (
    <section className="content-grid">
      <div className="panel wide">
        <PanelHeader icon={Receipt} title="Expense Ledger" action="Upload attachment" />
        <DataTable
          columns={['Category', 'Amount', 'Date', 'Recurring']}
          rows={expenseRows.map((expense) => [expense.category, expense.amount, expense.date, expense.recurring])}
        />
      </div>
      <div className="panel">
        <PanelHeader icon={BadgeDollarSign} title="Plan Limits" action="Pro" />
        <PlanLimit label="Members" value={84} max={100} />
        <PlanLimit label="Storage" value={138} max={200} suffix="MB" />
        <PlanLimit label="PDF reports" value={100} max={100} suffix="%" />
      </div>
    </section>
  )
}

function MealsPanel() {
  return (
    <section className="content-grid">
      <div className="panel wide">
        <PanelHeader icon={Soup} title="Daily Meal Entry" action="Submit meals" />
        <div className="meal-board">
          {members.map((member) => (
            <article key={member.name}>
              <strong>{member.name}</strong>
              <label><input defaultChecked type="checkbox" /> Breakfast</label>
              <label><input defaultChecked type="checkbox" /> Lunch</label>
              <label><input defaultChecked type="checkbox" /> Dinner</label>
            </article>
          ))}
        </div>
      </div>
      <div className="panel">
        <PanelHeader icon={Moon} title="Meal Off Requests" action="Today" />
        <div className="timeline">
          <span>Tanvir Ahmed requested dinner off</span>
          <span>Nusrat Jahan resumes breakfast tomorrow</span>
          <span>Meal notice sent to WhatsApp template</span>
        </div>
      </div>
    </section>
  )
}

function NoticesPanel() {
  return (
    <section className="content-grid">
      <div className="panel wide">
        <PanelHeader icon={Megaphone} title="Notice Board" action="Pin notice" />
        <div className="notice-list">
          {notices.map((notice) => (
            <article key={notice.title}>
              <div>
                <strong>{notice.title}</strong>
                <span>{notice.type}</span>
              </div>
              <StatusPill value={notice.priority} />
            </article>
          ))}
        </div>
      </div>
      <div className="panel">
        <PanelHeader icon={MessageCircle} title="WhatsApp Broadcast" action="Generate link" />
        <div className="broadcast-card">
          <p>Due reminder, meal off, emergency, and custom templates are ready for group-link broadcast logging.</p>
          <button className="primary-button" type="button"><MessageCircle size={17} /> Prepare message</button>
        </div>
      </div>
    </section>
  )
}

function TicketsPanel() {
  return (
    <section className="panel">
      <PanelHeader icon={TicketCheck} title="Maintenance Tickets" action="Create ticket" />
      <DataTable
        columns={['Issue', 'Member', 'Status', '']}
        rows={tickets.map((ticket) => [ticket.title, ticket.member, <StatusPill value={ticket.status} />, <MoreHorizontal size={18} />])}
      />
    </section>
  )
}

function ReportsPanel() {
  return (
    <section className="content-grid">
      <div className="panel wide">
        <PanelHeader icon={FileBarChart} title="Monthly Report Center" action="Export PDF" />
        <div className="report-grid">
          {['Expense Report', 'Meal Report', 'Member Report', 'Notice Activity Report'].map((report) => (
            <article key={report}>
              <FileBarChart size={22} />
              <strong>{report}</strong>
              <span>Tenant filtered by houseId and available for PDF export on paid plans.</span>
            </article>
          ))}
        </div>
      </div>
      <div className="panel">
        <PanelHeader icon={AlertTriangle} title="Audit Snapshot" action="Live" />
        <div className="timeline">
          <span>Expense updated by House Admin</span>
          <span>Notice pinned by Assistant Admin</span>
          <span>Failed login rate limited</span>
        </div>
      </div>
    </section>
  )
}

function SecurityPanel({ role }: { role: Role }) {
  const controls = ['JWT access tokens', 'Refresh token rotation', 'RBAC on API routes', 'NoSQL sanitization', 'MIME-restricted uploads', 'CSP and HSTS headers', 'Account lockout', 'Audit logging']
  return (
    <section className="content-grid">
      <div className="panel wide">
        <PanelHeader icon={Lock} title="Security Controls" action={role} />
        <div className="control-grid">
          {controls.map((control) => (
            <article key={control}>
              <ShieldCheck size={18} />
              <span>{control}</span>
            </article>
          ))}
        </div>
      </div>
      <div className="panel">
        <PanelHeader icon={UserCog} title="Moderator Boundaries" action="Least privilege" />
        <div className="permission-list">
          <span><CheckCircle2 size={16} /> Ops can review activity, not plans</span>
          <span><CheckCircle2 size={16} /> Support can reset access, not finances</span>
          <span><CheckCircle2 size={16} /> Finance can approve renewals only</span>
        </div>
      </div>
    </section>
  )
}

function PanelHeader({ icon: Icon, title, action }: { icon: typeof Home; title: string; action: string }) {
  return (
    <div className="panel-header">
      <h2><Icon size={20} /> {title}</h2>
      <button type="button">{action}</button>
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status ${value.toLowerCase().replace(/\s+/g, '-')}`}>{value}</span>
}

function PlanLimit({ label, value, max, suffix = '' }: { label: string; value: number; max: number; suffix?: string }) {
  const width = Math.min(100, (value / max) * 100)
  return (
    <div className="limit-row">
      <div>
        <span>{label}</span>
        <b>{value}{suffix} / {max}{suffix}</b>
      </div>
      <div className="progress-track"><i style={{ width: `${width}%` }} /></div>
    </div>
  )
}

function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<React.ReactNode>> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
