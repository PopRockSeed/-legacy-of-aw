package.path = package.path .. ";./?.cnf"
package.path = package.path .. ";map/?.cnf"

Config = Config or {}
arg = arg or {}
arg[1] = arg[1] or "../"

print("arg[1]"..arg[1])

require ("~cnf/cnfcity_new")
require ("~cnf/cnfnpc_new")
require ("~cnf/cnfitem")
require ("~cnf/cnfskill_new")
require ("~cnf/xcnfskillexecute")
require ("~cnf/cnfembattleitemcompose")
require ("~cnf/cnfbattlestory")
require ("~cnf/cnfpartnerinfo_new")

print("=== check city start ===")
for k, v in pairs(Config.cnfcity_new) do

	local map_id = v.id
	local file_name_list = {
		string.format(arg[1].."/config/map/map%d.cnf", map_id)
	}

	for _, file_name in pairs(file_name_list) do
		file_handle = io.open(file_name, "r")
		if(not file_handle) then
			print(string.format("city(%d) file(%s) not find", k, file_name))
		else
			file_handle:close()
		end
	end
end
print("=== check city finish ===")

print("=== check npc start ===")
for k, v in pairs(Config.cnfnpc_new) do
	local res_id = v.res_id
	local head_id = v.head_id
	local file_name_list = {
		string.format(arg[1].."/spine_role/%d.ssdz", res_id, res_id),
		string.format(arg[1].."/headpic/%d.sdz", head_id),
	}

	for _, file_name in pairs(file_name_list) do
		file_handle = io.open(file_name, "r")
		if(not file_handle) then
			print(string.format("npc(%d) file(%s) not find", k, file_name))
		else
			file_handle:close()
		end
	end

end
print("=== check ncp finish ===")

print("=== check item start ===")
for k, v in pairs(Config.CnfItem) do
	local res_id = v.res_id
	local file_name_list = {
		string.format(arg[1].."/items/%d.sdz", res_id),
	}

	for _, file_name in pairs(file_name_list) do
		file_handle = io.open(file_name, "r")
		if(not file_handle) then
			print(string.format("item(%d) file(%s) not find", k, file_name))
		else
			file_handle:close()
		end
	end

end
print("=== check item finish ===")

print("=== check cnfskill_new start ===")
for k, v in pairs(Config.cnfskill_new) do
	local anim_id = v.anim_id
	if Config.cnfskillexecute[anim_id] == nil then
		print(string.format("skill_id(%d) skillexecute(%d) not find", v.skill_id or 0, v.anim_id or 0))
	end

	-- 类型检测
	if v.skill_type == 1 then
		if v.trigger_condition ~= nil and #v.trigger_condition > 0 then
			print(string.format("skill_id(%d) 主动技能，但填有触发条件?", v.skill_id))
		end
		-- if #v.attr_list_key ~= 0 or #v.attr_list_value ~= 0 then
		-- 	print(string.format("skill_id(%d) 主动技能，但填有被动属性[%d,%d]?", v.skill_id, #v.attr_list_key, #v.attr_list_value))
		-- end
	elseif v.skill_type == 2 then
		if v.trigger_condition ~= nil and #v.trigger_condition > 0 then
			print(string.format("skill_id(%d) 被动技能，但填有触发条件?", v.skill_id))
		end
		if #v.attr_list_key == 0 or #v.attr_list_value == 0 then
			print(string.format("skill_id(%d) 被动技能，属性类型或类型为空[%d,%d]!", v.skill_id, #v.attr_list_key, #v.attr_list_value))
		end
	elseif v.skill_type == 3 then
		-- 	if v.trigger_condition == nil or #v.trigger_condition == 0 then
		-- 		print(string.format("skill_id(%d) 条件触发技能，触发数据为空!", v.skill_id)) -- 光环类型时为空
		-- 	end
		-- if #v.attr_list_key ~= 0 or #v.attr_list_value ~= 0 then
		-- 	print(string.format("skill_id(%d) 条件触发技能，但填有被动属性[%d,%d]?", v.skill_id, #v.attr_list_key, #v.attr_list_value))
		-- end
	elseif v.skill_type == 0 then
		print(string.format("skill_id(%d) type=0", v.skill_id))
	else
		print(string.format("skill_id(%d) 非法类型技能(%d)", v.skill_id, v.skill_type))
	end

	-- 效果检测
	local effect_list = { v.enemy_effect_list, v.partner_effect_list }
	for i,eft_lst in ipairs(effect_list) do
		for j,eft in ipairs(eft_lst) do
			-- 召唤效果
			if eft[1][1] == 54 then
				local summon_id = eft[3][1]
				local partner_id = math.floor(v.skill_id/10)
				if summon_id == partner_id then
					print(string.format("skill_id(%d) 不能召唤自己(%d)!!!", v.skill_id, summon_id))
				end
			end
		end
	end
end
print("=== check cnfskill_new finish ===")

print("=== check cnfskillexecute start ===")
for k, execute_list in pairs(Config.cnfskillexecute) do
	--解析获取资源
	local skill_res = {}
	for k,v in pairs(execute_list) do
		--飞行动画
		if v.fly_res_type and v.fly_id then
			local res = {}
			res[1] = v.fly_res_type
			res[2] = v.fly_id
			table.insert(skill_res, res)
		end
		--文字动画
		if v.font_res_id and v.font_res_id > 0 then
			local res = {}
			res[1] = 5
			res[2] = v.font_res_id
			table.insert(skill_res, res)
		end
		--合击角色动画
		if v.combine_res_id and v.combine_res_id > 0 then
			local res = {}
			res[1] = 2
			res[2] = v.combine_res_id
			table.insert(skill_res, res)
		end
		--合击背景动画
		if v.back_res_id and v.back_res_id > 0 then
			local res = {}
			res[1] = 2
			res[2] = v.back_res_id
			table.insert(skill_res, res)
		end
		--合击背景边动画
		if v.back_bian_res_id and v.back_bian_res_id > 0 then
			local res = {}
			res[1] = 2
			res[2] = v.back_bian_res_id
			table.insert(skill_res, res)
		end
		--区域动画
		if v.res_id and v.res_id > 0 then
			local res = {}
			res[1] = 2
			res[2] = v.res_id
			table.insert(skill_res, res)
		end
		--爆炸动画
		if v.boom_id and v.boom_id > 0 then
			local res = {}
			res[1] = 2
			res[2] = v.boom_id
			table.insert(skill_res, res)
		end
		--声音
		if v.sound_id and v.sound_id > 0 then
			local res = {}
			res[1] = 4
			res[2] = v.sound_id
			table.insert(skill_res, res)
		end
		--图片资源
		if v.png_id and v.png_id > 0 then
			local res = {}
			res[1] = 1
			res[2] = v.png_id
			table.insert(skill_res, res)
		end
	end

	--验证资源
	local filelist = {}
	for k, v in pairs(skill_res) do
		if v[2] ~= 0 then
			--图片
			if v[1] == 1 then
				local file_name = string.format(arg[1].."/effects/image_item/%d.sdz", v[2])
				table.insert(filelist, file_name)
			--骨骼
			elseif v[1] == 2 then
				table.insert(filelist, string.format(arg[1].."/effects/spine_anim/%d.ssdz", v[2], v[2]))
				table.insert(filelist, file_name)
			--音效
			elseif v[1] == 4 then
				local file_name = string.format(arg[1].."/sound/%d.sdzs", v[2])
				table.insert(filelist, file_name)
			--字体合击资源
			elseif v[1] == 5 then
				local file_name = string.format(arg[1].."/language/zh/spine_anim/%d.ssdz", v[2])
				table.insert(filelist, file_name)	
			end
		end
	end

	for _, file_name in pairs(filelist) do
		file_handle = io.open(file_name, "r")
		if(not file_handle) then
			print(string.format("skillexecute id(%d) file(%s) not find", k, file_name))
		else
			file_handle:close()
		end
	end

	--检查技能逻辑跳转状态
	for _,_v in pairs(execute_list) do
		if _v.fun == "damage_effect" and (_v.hit_h_state or 0) > 0 then
			if _v.hit_h_state > #execute_list then
				print(string.format("skillexecute id(%d) damage_effect v.hit_h_state(%d) overflow execute_list", k, _v.hit_h_state ))
			end
			if execute_list[_v.hit_h_state].fun ~= "node_anim" then
				print(string.format("skillexecute id(%d) damage_effect v.hit_h_state(%d) state is error", k, _v.hit_h_state ))
			end
		end
		if _v.fun == "skill_bullet" and _v.node_anim_state and _v.node_anim_state > 0 then
			local anim_state = {}
			local str_state = tostring(_v.node_anim_state)
			for i = 1,10 do
				local find_idx = string.find(str_state,"0")
				if find_idx == nil then
					if tonumber(str_state) then
						table.insert(anim_state,tonumber(str_state))
					end
					break
				end
				local state = tonumber(string.sub(str_state,1,find_idx-1))
				if state == nil then
					anim_state[#anim_state] = anim_state[#anim_state]*10
				end
				str_state = string.sub(str_state,find_idx+1)
				table.insert(anim_state,state)
			end
			for i = 1,#anim_state do
				local state = anim_state[i]
				if state > #execute_list then
					print(string.format("skillexecute id(%d) skill_bullet node_anim_state(%d) overflow execute_list", k, state))
				end
				if execute_list[state] then
					if execute_list[state].fun ~= "node_anim" then
						print(string.format("skillexecute id(%d) skill_bullet node_anim_state(%d) state is error", k, state))
					end
				else
					print(string.format("skillexecute id(%d) state(%d) miss error", k, state))
				end
			end
		end
	end
end
print("=== check cnfskillexecute finish ===")


-- 物品合成检测
print("=== check itemcompose start ===")
for item_id,item_info in pairs(Config.cnfembattleitemcompose) do
	local item = Config.CnfItem[item_id]
	if item == nil then
		print(string.format("物品合成 id(%d) 物品不存在", item_id))
	end
	if item_info.compose_by ~= nil and #item_info.compose_by > 0 then
		for i,child in ipairs(item_info.compose_by) do
			local child_item_id = child[1]
			local child_item_count = child[2]
			local child_item = Config.CnfItem[child_item_id]
			if child_item == nil then
				print(string.format("物品合成 id(%d) 子物品 id(%d) 不存在", item_id, child_item_id))
			end
			if type(child_item_count) ~= "number" then
				print(string.format("物品合成 id(%d) 子物品 id(%d) 数量类型错误", item_id, child_item_id))
			else
				if child_item_count < 1 then
					print(string.format("物品合成 id(%d) 子物品 id(%d) 数量值错误 count(%d)", item_id, child_item_id, child_item_count))
				end
			end
		end
	end
end
print("=== check itemcompose finish ===")


print("=== check cnfbattlestory start ===")
	for k,v in pairs(Config.cnfbattlestory) do
		local obj_list = v.obj_list
		for i2,v2 in ipairs(obj_list) do
			local partner_id = v2[1]
			if Config.cnfpartnerinfo_new[partner_id] == nil then
				print(string.format("副本剧情用到伙伴 partner_id=%d 不存在", partner_id))
			end
		end
	end
print("=== check cnfbattlestory finish ===")
