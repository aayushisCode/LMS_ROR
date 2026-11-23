import * as MUI from '@mui/material'
import * as AdminApi from '../../../api/adminApi'
import * as Shared from '../shared/AdminComponents'

export function CoursesContent({ rows, categories, loading, onEdit, onDelete }: { rows: AdminApi.CourseRecord[]; categories: AdminApi.CategoryRecord[]; loading: boolean; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  return <Shared.TablePanel loading={loading} empty={!loading && !rows.length}><MUI.Table><MUI.TableHead><MUI.TableRow><MUI.TableCell>COURSE</MUI.TableCell><MUI.TableCell>CATEGORY</MUI.TableCell><MUI.TableCell>STATUS</MUI.TableCell><MUI.TableCell>DESCRIPTION</MUI.TableCell><MUI.TableCell align="right">ACTIONS</MUI.TableCell></MUI.TableRow></MUI.TableHead><MUI.TableBody>{rows.map(row => <MUI.TableRow key={row.id} hover><MUI.TableCell><b>{row.title}</b></MUI.TableCell><MUI.TableCell>{categories.find(category => category.id === row.category_id)?.category_name ?? row.category_id}</MUI.TableCell><MUI.TableCell><Shared.StatusBadge label={row.status} /></MUI.TableCell><MUI.TableCell className="muted-cell course-description">{row.description || '—'}</MUI.TableCell><MUI.TableCell align="right"><Shared.RowActions onEdit={() => onEdit(row.id)} onDelete={() => onDelete(row.id)} /></MUI.TableCell></MUI.TableRow>)}</MUI.TableBody></MUI.Table></Shared.TablePanel>
}

