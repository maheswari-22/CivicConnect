import { query } from './database.js';
import { hashPassword } from '../utils/auth.js';
import { now } from '../utils/id.js';
import { env } from '../config/env.js';

export async function seed() {
  // The demo accounts have PUBLIC, well-known passwords. They must never exist on a real server.
  if (env.nodeEnv === 'production')
    throw new Error('Refusing to insert demo accounts (public passwords) while NODE_ENV=production.');
  const password = await hashPassword('worker@1234'), authorityPassword = await hashPassword('authority@1234'), citizenPassword = await hashPassword('citizen@1234'), t = now();
  const users = [['usr_authority_demo', 'authority', 'Municipal Officer', 'authority@civicconnect.com', null, null, 'AUTH-001', authorityPassword, null, 'Visakhapatnam', null, null], ['usr_authority_amr', 'authority', 'Amaravathi Officer', 'authority.amaravathi@civicconnect.com', null, null, 'AUTH-002', authorityPassword, null, 'Amaravathi', null, null], ['usr_citizen_demo', 'citizen', 'Demo Citizen', 'citizen@civicconnect.com', '+919876543210', null, null, citizenPassword, '+919876543210', 'Visakhapatnam', null, null],
    // Ongole demo set: one authority, one citizen and eight workers, all in the Ongole area.
    ['usr_authority_ong', 'authority', 'Ongole Officer', 'authority.ongole@civicconnect.com', null, null, 'AUTH-003', authorityPassword, null, 'Ongole', null, null],
    ['usr_citizen_ong', 'citizen', 'Ongole Citizen', 'citizen.ongole@civicconnect.com', '+919876543211', null, null, citizenPassword, '+919876543211', 'Ongole', null, null]];
  for (const u of users)
    await query(`INSERT INTO users(id,role,name,email,mobile,username,employee_id,password_hash,phone,area,worker_id,department,created_at,updated_at,email_verified) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,TRUE) ON CONFLICT DO NOTHING`, [...u, t]);
  const workers = [['WK-101', 'Ravi Kumar', 'Sanitation', '+919848010101'], ['WK-102', 'Deepak Rao', 'Sanitation', '+919848010102'], ['WK-103', 'Naveen Babu', 'Sanitation', '+919848010103'], ['WK-104', 'Suresh Reddy', 'Roads & Infrastructure', '+919848010104'], ['WK-105', 'Kiran Babu', 'Roads & Infrastructure', '+919848010105'], ['WK-106', 'Manoj Singh', 'Roads & Infrastructure', '+919848010106'], ['WK-107', 'Arjun Kumar', 'Water Works', '+919848010107'], ['WK-108', 'Ramesh Naidu', 'Water Works', '+919848010108'], ['WK-109', 'Mahesh Yadav', 'Water Works', '+919848010109'], ['WK-110', 'Vijay Rao', 'Electrical', '+919848010110'], ['WK-111', 'Sanjay Patel', 'Electrical', '+919848010111'], ['WK-112', 'Mohan Das', 'Electrical', '+919848010112'], ['WK-201', 'Lakshmi Prasad', 'Roads & Infrastructure', '+919848020201', 'Amaravathi'], ['WK-202', 'Hari Krishna', 'Sanitation', '+919848020202', 'Amaravathi'], ['WK-203', 'Venkat Rao', 'Water Works', '+919848020203', 'Amaravathi'], ['WK-204', 'Satish Kumar', 'Electrical', '+919848020204', 'Amaravathi'], ['WK-301', 'Srinivasa Rao', 'Roads & Infrastructure', '+919848030301', 'Ongole'], ['WK-302', 'Penchalaiah', 'Roads & Infrastructure', '+919848030302', 'Ongole'], ['WK-303', 'Venkateswarlu', 'Sanitation', '+919848030303', 'Ongole'], ['WK-304', 'Nagaraju', 'Sanitation', '+919848030304', 'Ongole'], ['WK-305', 'Subba Rao', 'Water Works', '+919848030305', 'Ongole'], ['WK-306', 'Koteswara Rao', 'Water Works', '+919848030306', 'Ongole'], ['WK-307', 'Anjaneyulu', 'Electrical', '+919848030307', 'Ongole'], ['WK-308', 'Prasad Babu', 'Electrical', '+919848030308', 'Ongole']];
  for (const [wid, name, department, phone, area = 'Visakhapatnam'] of workers)
    await query(`INSERT INTO users(id,role,name,email,username,password_hash,phone,area,worker_id,department,created_at,updated_at,email_verified) VALUES($1,'worker',$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,TRUE) ON CONFLICT DO NOTHING`, [`usr_${wid}`, name, `${wid.toLowerCase()}@civicconnect.com`, wid.toLowerCase(), password, phone, area, wid, department, t]);
  // Ongole demo complaints. They have fixed ids and ON CONFLICT DO NOTHING, so running the seed again is safe,
  // and they are added even when the database already holds other complaints.
  const ong = 'usr_citizen_ong', ongAuth = 'usr_authority_ong', ongDays = n => new Date(Date.now() + n * 86400000);
  const ongole = [
    ['CC-2026-1291', ong, 'road', 'Large pothole on Trunk Road near the bus stand, two-wheelers are swerving into traffic.', 'Trunk Road, near the bus stand, Ongole', 15.5046, 80.0478, 'assigned', 'High', 'usr_WK-301', ongAuth, ongDays(-1), ongDays(2), 'Fill and compact before the evening rush.', null, ongDays(-3), ongDays(-1)],
    ['CC-2026-1292', ong, 'light', 'Street lights on Kurnool Road have been off for several nights.', 'Kurnool Road, Ongole', 15.5093, 80.0391, 'progress', 'Medium', 'usr_WK-307', ongAuth, ongDays(-3), ongDays(1), 'Check the feeder and replace the faulty fittings.', null, ongDays(-5), ongDays(-1)],
    ['CC-2026-1293', ong, 'garbage', 'Garbage has piled up at the Santhapet market corner and has not been cleared for three days.', 'Santhapet market, Ongole', 15.5081, 80.0524, 'submitted', 'Medium', null, null, null, null, null, null, ongDays(-0.3), ongDays(-0.3)],
    ['CC-2026-1294', ong, 'water', 'Drinking water pipeline is leaking on Mangamuru Road and water is running onto the road.', 'Mangamuru Road, Ongole', 15.5121, 80.0562, 'review', 'High', null, null, null, null, null, null, ongDays(-1), ongDays(-0.5)],
    ['CC-2026-1295', ong, 'road', 'Broken drain cover on the Lawyerpet main road is a risk for pedestrians at night.', 'Lawyerpet main road, Ongole', 15.5003, 80.0452, 'resolved', 'Medium', 'usr_WK-302', ongAuth, ongDays(-9), ongDays(-6), 'Replace the cover and fix the edge.', ongDays(-6), ongDays(-11), ongDays(-6)],
    ['CC-2026-1296', ong, 'garbage', 'Overflowing bins near Bandlamitta junction.', 'Bandlamitta junction, Ongole', 15.4962, 80.0531, 'submitted', 'Low', null, null, null, null, null, null, ongDays(-0.1), ongDays(-0.1)],
  ];
  for (const r of ongole)
    await query(`INSERT INTO complaints(id,citizen_id,category,description,location,lat,lng,status,priority,worker_id,assigned_by,assigned_at,expected_by,note,completed_at,created_at,updated_at,area) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'Ongole') ON CONFLICT DO NOTHING`, r);
  const ongNotes = [
    ['ntf_demo_ong_01', ongAuth, 'CC-2026-1293', 'New complaint in Ongole', 'Garbage has piled up at the Santhapet market corner.', ongDays(-0.3)],
    ['ntf_demo_ong_02', ongAuth, 'CC-2026-1294', 'New complaint in Ongole', 'A water pipeline leak on Mangamuru Road needs a worker.', ongDays(-1)],
    ['ntf_demo_ong_03', ongAuth, 'CC-2026-1296', 'New complaint in Ongole', 'Overflowing bins near Bandlamitta junction.', ongDays(-0.1)],
    ['ntf_demo_ong_04', 'usr_WK-301', 'CC-2026-1291', 'New task assigned', 'Pothole on Trunk Road near the bus stand. Please fix it before the evening rush.', ongDays(-1)],
    ['ntf_demo_ong_05', 'usr_WK-307', 'CC-2026-1292', 'New task assigned', 'Street lights are off on Kurnool Road.', ongDays(-3)],
    ['ntf_demo_ong_06', ong, 'CC-2026-1291', 'Worker assigned', 'Srinivasa Rao has been assigned to your complaint about the Trunk Road pothole.', ongDays(-1)],
    ['ntf_demo_ong_07', ong, 'CC-2026-1295', 'Complaint resolved', 'The broken drain cover on the Lawyerpet main road has been fixed.', ongDays(-6)],
  ];
  for (const n of ongNotes)
    await query('INSERT INTO notifications(id,user_id,complaint_id,title,body,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', n);
  const { rows } = await query('SELECT COUNT(*)::int AS count FROM complaints WHERE area <> \'Ongole\'');
  if (rows[0].count > 0)
    return;
  const demo = 'usr_citizen_demo', auth = 'usr_authority_demo', days = n => new Date(Date.now() + n * 86400000);
  const data = [['CC-2026-1281', demo, 'road', 'Large pothole near the Sherwood Street junction, growing wider after the rain.', 'Sherwood Street, Sector 12', 17.385, 78.4867, 'assigned', 'High', 'usr_WK-105', auth, days(-2), days(1), 'Patch and compact before evening traffic.', null, days(-6), days(-2)], ['CC-2026-1282', demo, 'light', 'Street light outside the community park has been off for over a week.', 'Lakeview Park, Sector 9', 17.402, 78.474, 'resolved', 'Medium', 'usr_WK-112', auth, days(-10), days(-3), 'Replace the fitting.', days(-9), days(-14), days(-9)], ['CC-2026-1283', demo, 'garbage', 'Garbage bin near the market entrance is overflowing and has not been cleared.', 'Central Market Road', 17.39, 78.49, 'review', 'Medium', null, null, null, null, null, null, days(-2), days(-1)], ['CC-2026-1284', demo, 'water', 'Visible water leak from an underground pipe, water pooling on the footpath.', 'Elm Avenue, near Bus Stop 4', 17.375, 78.46, 'progress', 'High', 'usr_WK-107', auth, days(-3), days(1), 'Isolate the valve before excavating.', null, days(-4), days(-1)], ['CC-2026-1285', demo, 'road', 'Broken road divider creating a hazard for turning vehicles.', 'MG Road Crossing', 17.41, 78.48, 'submitted', 'Medium', null, null, null, null, null, null, days(-0.3), days(-0.3)], ['CC-2026-1286', demo, 'road', 'Deep pothole on the capital road near the Secretariat gate.', 'Capital Road, near Secretariat', 16.5131, 80.516, 'submitted', 'Medium', null, null, null, null, null, null, days(-0.2), days(-0.2), 'Amaravathi']];
  for (const r of data)
    await query(`INSERT INTO complaints(id,citizen_id,category,description,location,lat,lng,status,priority,worker_id,assigned_by,assigned_at,expected_by,note,completed_at,created_at,updated_at,area) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) ON CONFLICT DO NOTHING`, r.length === 17 ? [...r, 'Visakhapatnam'] : r);
  console.log('PostgreSQL seed complete.');
}
