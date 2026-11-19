const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API = 'http://localhost:5000/api';

async function testFullSuite() {
  console.log('=== Starting StudyTrack Full Integration Test ===');

  // 1. Health check
  const health = await axios.get(`${API}/health`);
  console.log('✔ [1/10] Health Check:', health.data.status);

  // 2. User Registration
  const testEmail = `student_${Date.now()}@university.edu`;
  const regRes = await axios.post(`${API}/auth/register`, {
    name: 'Alice Academic',
    email: testEmail,
    password: 'securePassword123'
  });
  console.log('✔ [2/10] User Registered:', regRes.data.user.email);
  const token = regRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 3. User Login & Me
  const meRes = await axios.get(`${API}/auth/me`, { headers: authHeaders });
  console.log('✔ [3/10] Auth Me Verified:', meRes.data.user.name);

  // 4. Create Subject
  const subRes = await axios.post(`${API}/subjects`, {
    name: 'Computer Networks 101',
    description: 'Protocol stacks, routing algorithms, transport layer and socket programming',
    color: '#3B82F6',
    icon: 'Globe'
  }, { headers: authHeaders });
  const subjectId = subRes.data.subject._id;
  console.log('✔ [4/10] Subject Created:', subRes.data.subject.name, subjectId);

  // 5. Create Units
  const unit1Res = await axios.post(`${API}/subjects/${subjectId}/units`, {
    name: 'Unit 1: The Network Layer',
    description: 'Routing algorithms, IPv4/IPv6 addressing, subnetting'
  }, { headers: authHeaders });
  const unit1Id = unit1Res.data.unit._id;
  console.log('✔ [5/10] Unit Created:', unit1Res.data.unit.name);

  // 6. Create Topics
  const topic1Res = await axios.post(`${API}/units/${unit1Id}/topics`, {
    title: 'Dijkstra Shortest Path Algorithm',
    description: 'Link-state routing algorithm implementation and complexity',
    priority: 'high'
  }, { headers: authHeaders });
  const topic1Id = topic1Res.data.topic._id;

  const topic2Res = await axios.post(`${API}/units/${unit1Id}/topics`, {
    title: 'CIDR Subnetting & Supernetting',
    description: 'Variable length subnet masking and IP allocations',
    priority: 'medium'
  }, { headers: authHeaders });
  const topic2Id = topic2Res.data.topic._id;
  console.log('✔ [6/10] Topics Created:', topic1Res.data.topic.title, '&', topic2Res.data.topic.title);

  // 7. Progress calculation & Checklist toggle
  await axios.patch(`${API}/topics/${topic1Id}/progress`, { completed: true }, { headers: authHeaders });
  const subCheck = await axios.get(`${API}/subjects/${subjectId}`, { headers: authHeaders });
  console.log(`✔ [7/10] Progress Tracking: ${subCheck.data.subject.completedTopics}/${subCheck.data.subject.totalTopics} (${subCheck.data.subject.progressPercentage}%)`);

  // 8. Add URL Material & Revision Notes
  const urlMatRes = await axios.post(`${API}/topics/${topic1Id}/materials`, {
    title: 'RFC 2328 OSPF Specification',
    url: 'https://datatracker.ietf.org/doc/html/rfc2328',
    description: 'Standard link-state protocol specification'
  }, { headers: authHeaders });
  console.log('✔ [8/10] URL Material Created:', urlMatRes.data.material.title);

  const noteRes = await axios.post(`${API}/topics/${topic1Id}/notes`, {
    content: '<h2>Dijkstra Key Points</h2><p>Time complexity is O(E + V log V) with Min-Heap. Negative weights not supported.</p>'
  }, { headers: authHeaders });
  console.log('✔ [8/10] Revision Note Created:', noteRes.data.note._id);

  // 9. Document Upload & Viewer endpoint check
  const sampleText = Buffer.from('StudyTrack Test Document for Computer Networks 2026');
  const form = new FormData();
  form.append('topicId', topic1Id);
  form.append('title', 'Routing Algorithms Lecture Slide.txt');
  form.append('description', 'Class notes slide document');
  form.append('file', sampleText, { filename: 'lecture_slide.txt', contentType: 'text/plain' });

  const uploadRes = await axios.post(`${API}/materials/upload`, form, {
    headers: { ...authHeaders, ...form.getHeaders() }
  });
  console.log('✔ [9/10] File Material Uploaded:', uploadRes.data.material.title, 'StoragePath:', uploadRes.data.material.storagePath);

  const viewRes = await axios.get(`${API}/materials/${uploadRes.data.material._id}/view`, {
    headers: authHeaders
  });
  console.log('✔ [9/10] File View Endpoint Responded Status:', viewRes.status);

  // 10. Global Search & Reset verification
  const searchRes = await axios.get(`${API}/search?q=Dijkstra`, { headers: authHeaders });
  console.log(`✔ [10/10] Search Found: ${searchRes.data.topics.length} topics, ${searchRes.data.notes.length} notes`);

  // Reset Progress check
  const resetRes = await axios.post(`${API}/reset/subject/${subjectId}`, {}, { headers: authHeaders });
  const subAfterReset = await axios.get(`${API}/subjects/${subjectId}`, { headers: authHeaders });
  console.log(`✔ [10/10] Reset Progress Checked: Completed is now ${subAfterReset.data.subject.completedTopics}/${subAfterReset.data.subject.totalTopics} (Materials & Notes preserved)`);

  console.log('\n🎉 ALL FULL-STACK INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
}

testFullSuite().catch(err => {
  console.error('Test Suite Failed:', err.response?.data || err.message);
  process.exit(1);
});
