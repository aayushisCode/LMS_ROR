import * as MUI from '@mui/material'
import * as AdminApi from '../../../api/adminApi'
import * as Shared from '../shared/AdminComponents'

export function CategoriesContent({ rows, loading, onEdit, onDelete }: { rows: AdminApi.CategoryRecord[]; loading: boolean; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  return <Shared.TablePanel loading={loading} empty={!loading && !rows.length}><MUI.Table><MUI.TableHead><MUI.TableRow><MUI.TableCell>CATEGORY</MUI.TableCell><MUI.TableCell>DESCRIPTION</MUI.TableCell><MUI.TableCell align="right">ACTIONS</MUI.TableCell></MUI.TableRow></MUI.TableHead><MUI.TableBody>{rows.map(row => <MUI.TableRow key={row.id} hover><MUI.TableCell><b>{row.category_name}</b></MUI.TableCell><MUI.TableCell className="muted-cell">{row.description || 'No description'}</MUI.TableCell><MUI.TableCell align="right"><Shared.RowActions onEdit={() => onEdit(row.id)} onDelete={() => onDelete(row.id)} /></MUI.TableCell></MUI.TableRow>)}</MUI.TableBody></MUI.Table></Shared.TablePanel>
}

